import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	enviarEmailService,
	type AnexoEmail,
	type ResultadoEnvioEmail,
} from "@/service/email/enviar-email.js";
import { gerarDanfeNfeService } from "@/service/nfe-emissao/gerar-danfe-nfe.js";
import { obterXmlAutorizadoNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

type EnviarEmailNotaFiscalVendaParametros = {
	idusuario: string;
	idnotafiscal: string;
	idempresa: string;
	destinatario: string;
	enviarXml?: boolean;
	enviarDanfe?: boolean;
	mensagem?: string;
};

export async function enviarEmailNotaFiscalVendaService({
	idusuario,
	idnotafiscal,
	idempresa,
	destinatario,
	enviarXml = true,
	enviarDanfe = true,
	mensagem,
}: EnviarEmailNotaFiscalVendaParametros): Promise<
	HttpResponse<ResultadoEnvioEmail>
> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	if (!nota) {
		return httpNaoEncontrado();
	}

	if (nota.idempresa !== idempresa) {
		return httpProibido();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (nota.status !== NFE_STATUS.AUTORIZADA) {
		return httpBadRequest(
			"Envio por e-mail disponível apenas para NF-e autorizada",
		);
	}

	if (!enviarXml && !enviarDanfe) {
		return httpBadRequest("Selecione ao menos um anexo (XML ou DANFE)");
	}

	const anexos: AnexoEmail[] = [];
	const chave = nota.chavenfe?.trim() || idnotafiscal;
	const numero = nota.numeronotafiscal ?? nota.numero ?? "S/N";
	const serie = nota.serie ?? "";

	if (enviarXml) {
		const xml = await obterXmlAutorizadoNotaFiscal(idnotafiscal);
		if (!xml) {
			return httpBadRequest("XML autorizado não encontrado para esta NF-e");
		}
		anexos.push({
			filename: `nfe-${chave}.xml`,
			content: xml,
			contentType: "application/xml",
		});
	}

	if (enviarDanfe) {
		const danfe = await gerarDanfeNfeService({
			idusuario,
			idnotafiscal,
		});

		if (!danfe.success || !danfe.body) {
			if (!danfe.success) {
				return {
					success: false,
					status: danfe.status,
					error: danfe.error ?? "Falha ao gerar DANFE",
					code: danfe.code,
				};
			}
			return httpBadRequest("Falha ao gerar DANFE");
		}

		anexos.push({
			filename: danfe.body.filename,
			content: danfe.body.pdf,
			contentType: "application/pdf",
		});
	}

	const cliente = nota.razaosocial?.trim() || "Cliente";
	const assunto = `NF-e ${numero}${serie ? `/${serie}` : ""} - ${cliente}`;
	const mensagemExtra = mensagem?.trim();

	const texto = [
		`Segue em anexo a NF-e ${numero}${serie ? `/${serie}` : ""}.`,
		chave ? `Chave de acesso: ${chave}` : null,
		mensagemExtra || null,
		"",
		"Este e-mail foi enviado automaticamente pelo Mais Gestão.",
	]
		.filter((linha) => linha !== null)
		.join("\n");

	const html = `
		<p>Segue em anexo a <strong>NF-e ${numero}${serie ? `/${serie}` : ""}</strong>.</p>
		${chave ? `<p>Chave de acesso: <code>${chave}</code></p>` : ""}
		${mensagemExtra ? `<p>${mensagemExtra.replace(/\n/g, "<br/>")}</p>` : ""}
		<p style="color:#666;font-size:12px">Este e-mail foi enviado automaticamente pelo Mais Gestão.</p>
	`;

	const resultado = await enviarEmailService({
		idusuario,
		idempresa,
		destinatario,
		assunto,
		texto,
		html,
		anexos,
	});

	if (resultado.success) {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "enviar_email_nfe",
			idusuario,
			recurso: "nota_fiscal",
			idrecurso: idnotafiscal,
			idempresa,
			criadoem: new Date().toISOString(),
			metadados: {
				destinatario,
				enviarXml,
				enviarDanfe,
				messageId: resultado.body?.messageId,
			},
		}).catch(console.error);
	}

	return resultado;
}

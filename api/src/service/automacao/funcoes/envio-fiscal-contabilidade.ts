import type { HttpResponse } from "@/model/http-model.js";
import { buscarContabilidadePorEmpresa } from "@/repositories/contabilidade-empresa-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { contarNfcePendentesNoPeriodo } from "@/repositories/nota-fiscal-repositories.js";
import { listarNotasParaExportacaoXmlContabilidade } from "@/repositories/nota-fiscal-repositories.js";
import type { Automacao } from "@/repositories/automacao-repositories.js";
import { periodoMesAnterior } from "@/service/automacao/calcular-proxima-execucao.js";
import { criarNotificacaoAgendadaService } from "@/service/notificacoes/criar-notificacao-agendada.js";
import { gerarArquivoSintegra } from "@/service/sintegra/gerar-sintegra.js";
import { enviarEmailService } from "@/service/email/enviar-email.js";
import {
	type ArquivoXmlCompactacao,
	compactarXmlsFiscais,
} from "@/util/compactar-xmls-fiscais.js";
import { obterXmlAutorizadoNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";

export const FUNCAO_ENVIO_FISCAL_CONTABILIDADE = "envio_fiscal_contabilidade";

export type ResultadoFuncaoAutomacao = {
	status: "sucesso" | "aguardando_correcao" | "falha";
	mensagem: string;
	detalhes?: Record<string, unknown>;
	/** Se true, o runner deve reagendar em ~6h em vez da recorrência normal. */
	reagendarTentativa?: boolean;
};

function resolverPastaXml(modelo: string | null): "nfe" | "nfce" | null {
	if (modelo === "55") return "nfe";
	if (modelo === "65") return "nfce";
	return null;
}

export async function executarEnvioFiscalContabilidade(
	automacao: Automacao,
	referencia: Date = new Date(),
): Promise<HttpResponse<ResultadoFuncaoAutomacao>> {
	const { dataInicio, dataFim } = periodoMesAnterior(referencia);
	const params = automacao.parametros ?? {};
	const incluirSintegra = params.incluirSintegra !== false;
	const incluirXml = params.incluirXml !== false;

	if (!incluirSintegra && !incluirXml) {
		return httpOk({
			status: "falha",
			mensagem: "Nenhum anexo selecionado (SINTEGRA/XML)",
		});
	}

	const pendentes = await contarNfcePendentesNoPeriodo({
		idempresa: automacao.idempresa,
		dataInicio,
		dataFim,
	});

	if (pendentes > 0) {
		await criarNotificacaoAgendadaService({
			tipo: "alerta_cupom_pendente_periodo",
			idempresa: automacao.idempresa,
			idrecurso: `${automacao.id}:${dataInicio}:${dataFim}`,
			titulo: `${pendentes} cupom(ns) NFC-e pendente(s) no período ${dataInicio} a ${dataFim}`,
			detalhes: {
				idautomacao: automacao.id,
				dataInicio,
				dataFim,
				quantidade: pendentes,
			},
		});

		return httpOk({
			status: "aguardando_correcao",
			mensagem: `Aguardando correção de ${pendentes} cupom(ns) no período`,
			reagendarTentativa: true,
			detalhes: { dataInicio, dataFim, pendentes },
		});
	}

	const contabilidade = await buscarContabilidadePorEmpresa(automacao.idempresa);
	if (!contabilidade?.ativo || !contabilidade.emailprincipal) {
		return httpOk({
			status: "falha",
			mensagem:
				"Contabilidade não cadastrada ou inativa. Configure em Configuração da contabilidade.",
		});
	}

	const empresa = await buscarEmpresaPorId(automacao.idempresa);
	const idusuario = empresa?.idproprietario;
	if (!idusuario) {
		return httpBadRequest("Empresa sem proprietário para envio");
	}

	const anexos: Array<{
		filename: string;
		content: Buffer | string;
		contentType?: string;
	}> = [];
	const resumo: Record<string, unknown> = { dataInicio, dataFim };

	if (incluirSintegra) {
		try {
			const sintegra = await gerarArquivoSintegra({
				idempresa: automacao.idempresa,
				dataInicio,
				dataFim,
				finalidade: params.finalidadeSintegra ?? "1",
			});
			anexos.push({
				filename: sintegra.filename,
				content: Buffer.from(sintegra.conteudo, "utf-8"),
				contentType: "text/plain",
			});
			resumo.sintegraLinhas = sintegra.totalLinhas;
			resumo.sintegraAlertas = sintegra.alertas;
		} catch (erro) {
			const msg =
				erro instanceof Error ? erro.message : "Falha ao gerar SINTEGRA";
			return httpOk({
				status: "falha",
				mensagem: msg,
				detalhes: resumo,
			});
		}
	}

	if (incluirXml) {
		const notas = await listarNotasParaExportacaoXmlContabilidade({
			idempresa: automacao.idempresa,
			dataInicio,
			dataFim,
		});

		const arquivos: ArquivoXmlCompactacao[] = [];
		for (const nota of notas) {
			const chave = nota.chavenfe?.trim();
			if (!chave) continue;
			const pasta = resolverPastaXml(nota.modelo);
			if (!pasta) continue;
			const xml = await obterXmlAutorizadoNotaFiscal(nota.id);
			if (!xml) continue;
			arquivos.push({
				pasta,
				nomeArquivo: `${chave}-autorizado.xml`,
				conteudo: xml,
			});
		}

		if (arquivos.length > 0) {
			const zip = await compactarXmlsFiscais(arquivos);
			const cnpj =
				empresa?.cnpj?.replace(/\D/g, "") || automacao.idempresa.slice(0, 8);
			anexos.push({
				filename: `xmls-fiscais-${cnpj}-${dataInicio}-${dataFim}.zip`,
				content: zip,
				contentType: "application/zip",
			});
			resumo.totalNfe = arquivos.filter((a) => a.pasta === "nfe").length;
			resumo.totalNfce = arquivos.filter((a) => a.pasta === "nfce").length;
		} else {
			resumo.xmls = "nenhum_xml_autorizado";
		}
	}

	if (anexos.length === 0) {
		return httpOk({
			status: "falha",
			mensagem: "Nenhum arquivo gerado para o período",
			detalhes: resumo,
		});
	}

	const destinatarios = [
		contabilidade.emailprincipal,
		...(contabilidade.emailsadicionais ?? []),
	].filter(Boolean);

	const assunto = `Obrigações fiscais ${dataInicio} a ${dataFim} — ${empresa?.nome ?? "Empresa"}`;
	const texto = [
		`Segue em anexo a documentação fiscal do período ${dataInicio} a ${dataFim}.`,
		incluirSintegra ? "- Arquivo SINTEGRA" : null,
		incluirXml ? "- ZIP com XMLs autorizados (NF-e / NFC-e)" : null,
		"",
		"Enviado automaticamente pelo Mais Gestão.",
	]
		.filter((l) => l !== null)
		.join("\n");

	let ultimoMessageId: string | undefined;
	for (const destinatario of destinatarios) {
		const envio = await enviarEmailService({
			idusuario,
			idempresa: automacao.idempresa,
			destinatario,
			assunto,
			texto,
			anexos,
		});

		if (!envio.success) {
			return httpOk({
				status: "falha",
				mensagem:
					typeof envio.error === "string"
						? envio.error
						: "Falha no envio SMTP",
				detalhes: { ...resumo, destinatario },
			});
		}
		ultimoMessageId = envio.body?.messageId;
	}

	await criarNotificacaoAgendadaService({
		tipo: "alerta_agendado",
		idempresa: automacao.idempresa,
		idrecurso: `automacao-ok:${automacao.id}:${dataInicio}`,
		titulo: `Envio fiscal à contabilidade concluído (${dataInicio} a ${dataFim})`,
		detalhes: { idautomacao: automacao.id, ...resumo },
	});

	return httpOk({
		status: "sucesso",
		mensagem: "Envio fiscal concluído",
		detalhes: {
			...resumo,
			messageId: ultimoMessageId,
			destinatarios,
		},
	});
}

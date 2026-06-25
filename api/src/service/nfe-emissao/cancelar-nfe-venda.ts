import type { HttpResponse } from "@/model/http-model.js";
import { cancelarNfeGateway } from "@/lib/nfe-gateway-client.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { normalizarCodigoStatusNfe } from "@/util/resolver-status-emissao-nfe.js";
import {
	normalizarJustificativaNfe,
	resolverStatusCancelamentoNfe,
	validarCancelamentoNfe,
} from "@/util/validar-eventos-nfe.js";
import { estornarIntegracaoNotaFiscalVendaService } from "@/service/nota-fiscal/estornar-integracao-nota-fiscal-venda.js";
import { salvarXmlEventoEmDisco } from "@/util/xml-storage.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export type ResultadoCancelamentoNfe = {
	idnotafiscal: string;
	status: number;
	cStat?: string;
	xMotivo?: string;
	protocolo?: string;
};

type CancelarNfeVendaParametros = {
	idusuario: string;
	idnotafiscal: string;
	justificativa: string;
};

export async function cancelarNfeVendaService({
	idusuario,
	idnotafiscal,
	justificativa,
}: CancelarNfeVendaParametros): Promise<HttpResponse<ResultadoCancelamentoNfe>> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	if (!nota) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		nota.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const validacao = validarCancelamentoNfe(nota, justificativa);
	if (!validacao.ok) {
		return httpBadRequest(validacao.mensagem);
	}

	const credenciais = await montarCredenciaisGatewayNfe(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const justificativaNormalizada = normalizarJustificativaNfe(justificativa);
	const chave = nota.chavenfe!.replace(/\D/g, "");

	const resposta = await cancelarNfeGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		dados: {
			chave,
			protocolo: nota.protocolonfe!,
			justificativa: justificativaNormalizada,
		},
	});

	if (!resposta.sucesso) {
		return httpBadRequest(
			resposta.xMotivo ??
				resposta.erro ??
				"SEFAZ não autorizou o cancelamento da NF-e",
		);
	}

	const cStat = String(resposta.cStat ?? "").trim();
	const status = resolverStatusCancelamentoNfe(cStat);
	const agora = new Date().toISOString();

	if (resposta.xmlProtocolado?.trim()) {
		try {
			await salvarXmlEventoEmDisco(
				nota.idempresa,
				chave,
				"cancelado",
				resposta.xmlProtocolado,
			);
		} catch (erro) {
			console.error("Falha ao salvar XML de cancelamento:", erro);
		}
	}

	await atualizarNotaFiscal(idnotafiscal, {
		status,
		cancelamento: agora,
		justificativacancelamentonfe: justificativaNormalizada,
		mensagemprotocolonfe: resposta.xMotivo ?? null,
		codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStat),
	});

	await estornarIntegracaoNotaFiscalVendaService({
		idusuario,
		idnotafiscal,
	}).catch((erro) => {
		console.error("Falha ao estornar integração operacional da NF cancelada:", erro);
	});

	return httpOk<ResultadoCancelamentoNfe>({
		idnotafiscal,
		status,
		cStat,
		xMotivo: resposta.xMotivo,
		protocolo: resposta.protocolo,
	});
}

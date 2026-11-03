import { consultarSituacaoChaveSefazGateway } from "@/lib/nfe-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import { enfileirarEnvioDominioSilencioso } from "@/service/dominio/enfileirar-envio-dominio.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { estornarIntegracaoNotaFiscalVendaService } from "@/service/nota-fiscal/estornar-integracao-nota-fiscal-venda.js";
import { agoraBrasiliaNaiveIso } from "@/util/data-hora-brasilia.js";
import { extrairEventoCancelamentoConsultaNfe } from "@/util/extrair-evento-cancelamento-consulta-nfe.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	MENSAGEM_NFCE_NO_FLUXO_NFE,
	notaEhModeloNfe55,
	notaEhModeloNfce65,
} from "@/util/modelo-documento-fiscal-fluxo.js";
import { NFE_STATUS, statusEhCancelada } from "@/util/nfe-status.js";
import { normalizarCodigoStatusNfe } from "@/util/resolver-status-emissao-nfe.js";
import { classificarConsultaSituacaoNfe } from "@/util/validar-eventos-nfe.js";
import { salvarXmlEventoEmDisco } from "@/util/xml-storage.js";

const JUSTIFICATIVA_CONSULTA =
	"Cancelamento identificado na consulta de situação da SEFAZ";

export type ResultadoConsultaSituacaoNfe = {
	idnotafiscal: string;
	status: number;
	alterouStatus: boolean;
	situacao: "autorizada" | "cancelada" | "inalterada";
	cStat?: string;
	xMotivo?: string;
	avisos?: string[];
};

export async function consultarSituacaoNfeVendaService(params: {
	idusuario: string;
	idnotafiscal: string;
}): Promise<HttpResponse<ResultadoConsultaSituacaoNfe>> {
	const nota = await buscarNotaFiscalPorId(params.idnotafiscal);
	if (!nota) return httpNaoEncontrado();

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		nota.idempresa,
	);
	if (!usuarioPertenceEmpresa) return httpProibido();

	if (!notaEhModeloNfe55(nota.modelo)) {
		return httpBadRequest(
			notaEhModeloNfce65(nota.modelo)
				? MENSAGEM_NFCE_NO_FLUXO_NFE
				: "Somente NF-e (modelo 55) podem ter a situação consultada",
		);
	}

	if (nota.tipoorigem !== 1) {
		return httpBadRequest(
			"Somente NF-e de saída podem ter a situação consultada",
		);
	}

	const statusAtual = nota.status ?? NFE_STATUS.PENDENTE;
	if (statusEhCancelada(statusAtual)) {
		return httpOk({
			idnotafiscal: nota.id,
			status: statusAtual,
			alterouStatus: false,
			situacao: "cancelada",
			xMotivo: "NF-e já está cancelada no sistema",
		});
	}

	if (statusAtual !== NFE_STATUS.AUTORIZADA) {
		return httpBadRequest(
			"Somente NF-e autorizadas podem ter a situação consultada",
		);
	}

	const chave = nota.chavenfe?.replace(/\D/g, "") ?? "";
	if (chave.length !== 44) {
		return httpBadRequest("NF-e sem chave de acesso válida");
	}

	const credenciais = await montarCredenciaisGatewayNfe(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((pendencia) => pendencia.mensagem).join("; "),
		);
	}

	const resposta = await consultarSituacaoChaveSefazGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		chaveNfe: chave,
	});

	if (!resposta.sucesso) {
		return httpBadRequest(
			resposta.xMotivo ??
				resposta.erro ??
				"Não foi possível consultar a situação da NF-e na SEFAZ",
		);
	}

	const cStat = String(resposta.cStat ?? "").trim();
	const xMotivo = resposta.xMotivo?.trim() || undefined;
	const xmlConsulta = resposta.xml?.trim() || undefined;
	const classificacao = classificarConsultaSituacaoNfe(cStat);
	const consultaPersistida = {
		datahoraconsultasituacao: agoraBrasiliaNaiveIso(),
		...(xmlConsulta ? { arquivoxmlconsultasituacao: xmlConsulta } : {}),
	};

	if (classificacao.situacao !== "cancelada") {
		await atualizarNotaFiscal(nota.id, consultaPersistida);
		return httpOk({
			idnotafiscal: nota.id,
			status: statusAtual,
			alterouStatus: false,
			situacao: classificacao.situacao,
			...(cStat ? { cStat } : {}),
			...(xMotivo ? { xMotivo } : {}),
		});
	}

	const evento = extrairEventoCancelamentoConsultaNfe(xmlConsulta);
	const justificativa = (evento?.justificativa ?? JUSTIFICATIVA_CONSULTA).slice(
		0,
		255,
	);

	if (evento?.xml) {
		try {
			await salvarXmlEventoEmDisco(
				nota.idempresa,
				chave,
				"cancelado",
				evento.xml,
			);
		} catch (erro) {
			console.error("Falha ao salvar XML de cancelamento da consulta:", erro);
		}
	}

	await atualizarNotaFiscal(nota.id, {
		...consultaPersistida,
		status: classificacao.status,
		cancelamento: new Date().toISOString(),
		justificativacancelamentonfe: justificativa,
		mensagemprotocolonfe: xMotivo ?? null,
		codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStat),
		...(evento?.xml ? { arquivoxmlcancelada: evento.xml } : {}),
	});

	void enfileirarEnvioDominioSilencioso({
		idempresa: nota.idempresa,
		idnotafiscal: nota.id,
		tipo: "cancelamento",
	});

	const estorno = await estornarIntegracaoNotaFiscalVendaService({
		idusuario: params.idusuario,
		idnotafiscal: nota.id,
	}).catch((erro) => {
		console.error(
			"Falha ao estornar integração operacional da NF cancelada na consulta:",
			erro,
		);
		return null;
	});

	const avisos = estorno?.success
		? (estorno.body?.avisos ?? [])
		: ["Não foi possível estornar estoque e financeiro automaticamente"];

	return httpOk({
		idnotafiscal: nota.id,
		status: classificacao.status,
		alterouStatus: true,
		situacao: "cancelada",
		...(cStat ? { cStat } : {}),
		...(xMotivo ? { xMotivo } : {}),
		...(avisos.length > 0 ? { avisos } : {}),
	});
}

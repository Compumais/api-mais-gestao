import type { HttpResponse } from "@/model/http-model.js";
import { inutilizarNfeGateway } from "@/lib/nfe-gateway-client.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import { montarCredenciaisGatewayNfce } from "@/service/nfce-emissao/montar-credenciais-gateway-nfce.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { resolverModeloDocumentoFiscal } from "@/util/resolver-modelo-documento-fiscal.js";
import { normalizarCodigoStatusNfe } from "@/util/resolver-status-emissao-nfe.js";
import {
	inutilizacaoJaEncerradaNaSefaz,
	normalizarJustificativaNfe,
	numeracaoInutilizacaoDaNota,
	obterAnoInutilizacaoNfe,
	validarInutilizacaoNfe,
} from "@/util/validar-eventos-nfe.js";
import { salvarXmlEventoEmDisco } from "@/util/xml-storage.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export type ResultadoInutilizacaoNfe = {
	idnotafiscal: string;
	status: number;
	cStat?: string;
	xMotivo?: string;
	protocolo?: string;
};

type InutilizarNfeVendaParametros = {
	idusuario: string;
	idnotafiscal: string;
	justificativa: string;
};

export async function inutilizarNfeVendaService({
	idusuario,
	idnotafiscal,
	justificativa,
}: InutilizarNfeVendaParametros): Promise<HttpResponse<ResultadoInutilizacaoNfe>> {
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

	const validacao = validarInutilizacaoNfe(nota, justificativa);
	if (!validacao.ok) {
		return httpBadRequest(validacao.mensagem);
	}

	const modeloSefaz = resolverModeloDocumentoFiscal(nota.modelo);
	const credenciais =
		modeloSefaz === 65
			? await montarCredenciaisGatewayNfce(nota.idempresa)
			: await montarCredenciaisGatewayNfe(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const numeracao = numeracaoInutilizacaoDaNota(nota);
	if (!numeracao) {
		return httpBadRequest("Série ou número inválidos para inutilização");
	}

	const { serie, numero } = numeracao;
	const justificativaNormalizada = normalizarJustificativaNfe(justificativa);
	const configJson = {
		...credenciais.configJson,
		modelo: modeloSefaz,
		...(nota.tipoambientenfe === 1 || nota.tipoambientenfe === 2
			? { tpAmb: nota.tipoambientenfe }
			: {}),
	};

	const resposta = await inutilizarNfeGateway({
		configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		dados: {
			modelo: modeloSefaz,
			serie,
			numeroInicial: numero,
			numeroFinal: numero,
			ano: String(obterAnoInutilizacaoNfe(nota)).padStart(2, "0"),
			justificativa: justificativaNormalizada,
		},
	});

	const cStat = String(resposta.cStat ?? "").trim();
	const xMotivo =
		resposta.xMotivo?.trim() ||
		resposta.erro?.trim() ||
		"SEFAZ não autorizou a inutilização da numeração";
	if (
		!resposta.sucesso &&
		!inutilizacaoJaEncerradaNaSefaz(cStat, xMotivo)
	) {
		return httpBadRequest(xMotivo);
	}

	const identificador = `inutil-${serie}-${numero}`;

	if (resposta.xmlRetorno?.trim()) {
		try {
			await salvarXmlEventoEmDisco(
				nota.idempresa,
				identificador,
				"inutilizado",
				resposta.xmlRetorno,
			);
		} catch (erro) {
			console.error("Falha ao salvar XML de inutilização:", erro);
		}
	}

	await atualizarNotaFiscal(idnotafiscal, {
		status: NFE_STATUS.INUTILIZADA,
		justificativacancelamentonfe: justificativaNormalizada,
		mensagemprotocolonfe: resposta.xMotivo?.trim() || xMotivo,
		codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStat),
		protocolonfe: resposta.protocolo ?? nota.protocolonfe,
	});

	return httpOk<ResultadoInutilizacaoNfe>({
		idnotafiscal,
		status: NFE_STATUS.INUTILIZADA,
		cStat,
		xMotivo,
		protocolo: resposta.protocolo,
	});
}

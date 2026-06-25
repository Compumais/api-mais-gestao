import type { HttpResponse } from "@/model/http-model.js";
import { inutilizarNfeGateway } from "@/lib/nfe-gateway-client.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { normalizarCodigoStatusNfe } from "@/util/resolver-status-emissao-nfe.js";
import {
	normalizarJustificativaNfe,
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

	const credenciais = await montarCredenciaisGatewayNfe(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const serie = Number(nota.serie);
	const numero = Number(nota.numeronotafiscal);
	const justificativaNormalizada = normalizarJustificativaNfe(justificativa);

	const resposta = await inutilizarNfeGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		dados: {
			serie,
			numeroInicial: numero,
			numeroFinal: numero,
			justificativa: justificativaNormalizada,
		},
	});

	if (!resposta.sucesso) {
		return httpBadRequest(
			resposta.xMotivo ??
				resposta.erro ??
				"SEFAZ não autorizou a inutilização da numeração",
		);
	}

	const cStat = String(resposta.cStat ?? "").trim();
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
		mensagemprotocolonfe: resposta.xMotivo ?? null,
		codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStat),
		protocolonfe: resposta.protocolo ?? nota.protocolonfe,
	});

	return httpOk<ResultadoInutilizacaoNfe>({
		idnotafiscal,
		status: NFE_STATUS.INUTILIZADA,
		cStat,
		xMotivo: resposta.xMotivo,
		protocolo: resposta.protocolo,
	});
}

import type { HttpResponse } from "@/model/http-model.js";
import { manifestarCienciaOperacaoGateway } from "@/lib/nfe-gateway-client.js";
import { buscarNotaFiscalPorChaveNfe } from "@/repositories/nota-fiscal-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { criarRascunhoImportacaoNfService } from "@/service/nota-fiscal/importacao/criar-rascunho-importacao-nf.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import { validarChaveNfe } from "@/util/validar-chave-nfe.js";
import {
	buscarXmlNfePorChave,
	ErroBuscaXmlNfePorChave,
} from "./buscar-xml-nfe-por-chave.js";

const INTERVALO_RETRY_MS = 2_000;
const MAX_TENTATIVAS_APOS_MANIFESTACAO = 3;

function aguardar(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export type ImportarNotaPorChaveParametros = {
	idempresa: string;
	idusuario: string;
	chaveNfe: string;
	idplanocontas?: string;
	idcondicaopagto?: string;
	xmlOpcional?: string;
};

export type ImportarNotaPorChaveResposta = {
	idRascunho: string;
	urlRascunho: string;
	chavenfe: string;
};

async function tentarObterProcNFe(
	idempresa: string,
	chave: string,
	xmlOpcional?: string,
): Promise<string> {
	const resultado = await buscarXmlNfePorChave({
		idempresa,
		chaveNfe: chave,
		xmlOpcional,
	});
	return resultado.xml;
}

async function manifestarCienciaERetentar(
	idempresa: string,
	chave: string,
): Promise<string> {
	const credenciais = await montarCredenciaisGatewayNfe(idempresa);

	if (!credenciais.ok) {
		throw new ErroBuscaXmlNfePorChave(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
			"CERTIFICADO",
		);
	}

	const manifestacao = await manifestarCienciaOperacaoGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		chaveNfe: chave,
	});

	if (!manifestacao.sucesso) {
		throw new ErroBuscaXmlNfePorChave(
			manifestacao.xMotivo ??
				manifestacao.erro ??
				"Falha ao manifestar ciência da operação na SEFAZ",
			"SEFAZ",
			manifestacao.cStat,
		);
	}

	for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_APOS_MANIFESTACAO; tentativa++) {
		await aguardar(INTERVALO_RETRY_MS);

		try {
			return await tentarObterProcNFe(idempresa, chave);
		} catch (erro) {
			if (
				erro instanceof ErroBuscaXmlNfePorChave &&
				erro.codigo === "RESUMO_APENAS" &&
				tentativa < MAX_TENTATIVAS_APOS_MANIFESTACAO
			) {
				continue;
			}
			throw erro;
		}
	}

	throw new ErroBuscaXmlNfePorChave(
		"Ciência registrada, mas o XML completo ainda não está disponível na SEFAZ. Aguarde alguns minutos e tente novamente.",
		"RESUMO_APENAS",
	);
}

export async function importarNotaPorChaveService({
	idempresa,
	idusuario,
	chaveNfe,
	idplanocontas,
	idcondicaopagto,
	xmlOpcional,
}: ImportarNotaPorChaveParametros): Promise<
	HttpResponse<ImportarNotaPorChaveResposta>
> {
	const validacao = validarChaveNfe(chaveNfe);

	if (!validacao.ok) {
		return httpBadRequest(validacao.mensagem);
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const notaExistente = await buscarNotaFiscalPorChaveNfe(
		idempresa,
		validacao.chave,
	);

	if (notaExistente && notaExistente.status !== 99) {
		return httpBadRequest("Esta NF-e já foi importada no sistema");
	}

	let xmlProcNFe: string;

	try {
		xmlProcNFe = await tentarObterProcNFe(idempresa, validacao.chave, xmlOpcional);
	} catch (erro) {
		if (
			erro instanceof ErroBuscaXmlNfePorChave &&
			erro.codigo === "RESUMO_APENAS"
		) {
			try {
				xmlProcNFe = await manifestarCienciaERetentar(
					idempresa,
					validacao.chave,
				);
			} catch (erroManifestacao) {
				if (erroManifestacao instanceof ErroBuscaXmlNfePorChave) {
					return httpBadRequest(erroManifestacao.message);
				}
				throw erroManifestacao;
			}
		} else if (erro instanceof ErroBuscaXmlNfePorChave) {
			return httpBadRequest(erro.message);
		} else {
			throw erro;
		}
	}

	const resultadoRascunho = await criarRascunhoImportacaoNfService({
		idusuario,
		idempresa,
		xml: xmlProcNFe,
		idplanocontas,
		idcondicaopagto,
	});

	if (!resultadoRascunho.success || !resultadoRascunho.body) {
		if (!resultadoRascunho.success) {
			return resultadoRascunho as HttpResponse<ImportarNotaPorChaveResposta>;
		}
		return httpErroInterno() as HttpResponse<ImportarNotaPorChaveResposta>;
	}

	const idRascunho = resultadoRascunho.body.idRascunho;

	return httpCriacao({
		idRascunho,
		urlRascunho: `/nota-fiscal-compra/rascunho/${idRascunho}`,
		chavenfe: validacao.chave,
	});
}

import { buscarCfopPorCodigo } from "@/repositories/cfop-repositories.js";
import {
	buscarCfopEntradaPorCodigoSaida,
	buscarCfopSaidaPorEntrada,
} from "@/repositories/cfop-depara-repositories.js";
import { buscarCestPorCodigo } from "@/repositories/cest-repositories.js";
import { buscarNcmPorCodigo } from "@/repositories/ncm-repositories.js";
import { buscarUnidadeMedidaPorSigla } from "@/repositories/unidade-medida-repositories.js";
import { sugerirCodigoCfopEntradaPorCfopXml } from "@/util/cfop-entrada-depara-planilha.js";
import { isCfopEntrada } from "@/util/cfop-entrada-validacao.js";
import { inferirCodigoCfopSaida } from "@/util/cfop-depara-util.js";

export async function resolverCfopImportacao(
	idempresa: string,
	codigoCfop?: string | undefined,
) {
	if (!codigoCfop) return null;

	const cfopEncontrado = await buscarCfopPorCodigo(idempresa, codigoCfop);

	return cfopEncontrado
		? { id: cfopEncontrado.id, codigo: cfopEncontrado.codigo ?? codigoCfop }
		: null;
}

/**
 * Resolve CFOP de entrada a partir do CFOP do XML (saída do emitente).
 * Ordem: depara cadastrado (codigosaida) → planilha padrão (revenda) → cadastro por código.
 */
export async function resolverCfopEntradaPorCfopXml(
	idempresa: string,
	codigoCfopXml?: string | undefined,
	uf?: string | undefined,
): Promise<{ id: string; codigo: string } | null> {
	if (!codigoCfopXml) return null;

	const codigoSaida = codigoCfopXml.replace(/\D/g, "");
	if (codigoSaida.length < 4) return null;

	const dePara = await buscarCfopEntradaPorCodigoSaida(
		idempresa,
		codigoSaida,
		uf,
	);

	if (dePara?.idcfopentrada && dePara.codigoentrada) {
		if (isCfopEntrada(dePara.codigoentrada)) {
			return {
				id: dePara.idcfopentrada,
				codigo: dePara.codigoentrada,
			};
		}
	}

	const codigoEntradaSugerido = sugerirCodigoCfopEntradaPorCfopXml(codigoSaida);
	if (!codigoEntradaSugerido) return null;

	const cfopEntrada = await buscarCfopPorCodigo(idempresa, codigoEntradaSugerido);
	if (!cfopEntrada?.id || !cfopEntrada.codigo) return null;
	if (!isCfopEntrada(cfopEntrada.codigo)) return null;

	return {
		id: cfopEntrada.id,
		codigo: cfopEntrada.codigo,
	};
}

export async function resolverUnidadeImportacao(
	idempresa: string,
	sigla?: string | undefined,
) {
	if (!sigla) return null;

	const unidade = await buscarUnidadeMedidaPorSigla(idempresa, sigla);

	return unidade
		? { id: unidade.id, codigo: unidade.codigo ?? sigla, nome: unidade.nome }
		: null;
}

export async function resolverNcmImportacao(
	idempresa: string,
	codigoNcm?: string | undefined,
) {
	if (!codigoNcm) return null;

	const ncm = await buscarNcmPorCodigo(idempresa, codigoNcm);

	return ncm ? { id: ncm.id, codigo: ncm.codigo ?? codigoNcm } : null;
}

export async function resolverCestImportacao(
	idempresa: string,
	codigoCest?: string | undefined,
) {
	if (!codigoCest) return null;

	const cestEncontrado = await buscarCestPorCodigo(idempresa, codigoCest);

	return cestEncontrado
		? { id: cestEncontrado.id, codigo: cestEncontrado.codigo ?? codigoCest }
		: null;
}

export async function resolverCfopSaidaDeEntrada(
	idempresa: string,
	idcfopentrada?: string | undefined,
	codigoEntrada?: string | undefined,
	uf?: string | undefined,
) {
	if (idcfopentrada) {
		const dePara = await buscarCfopSaidaPorEntrada(
			idempresa,
			idcfopentrada,
			uf,
		);

		if (dePara?.idcfopsaida) {
			return { id: dePara.idcfopsaida, codigo: dePara.codigosaida ?? undefined };
		}
	}

	const codigoSaidaInferido = codigoEntrada
		? inferirCodigoCfopSaida(codigoEntrada)
		: null;

	if (!codigoSaidaInferido) return null;

	const cfopSaida = await buscarCfopPorCodigo(idempresa, codigoSaidaInferido);

	return cfopSaida
		? { id: cfopSaida.id, codigo: cfopSaida.codigo ?? codigoSaidaInferido }
		: null;
}

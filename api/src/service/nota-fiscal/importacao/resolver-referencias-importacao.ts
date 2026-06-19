import { buscarCfopPorCodigo } from "@/repositories/cfop-repositories.js";
import { buscarCfopSaidaPorEntrada } from "@/repositories/cfop-depara-repositories.js";
import { buscarCestPorCodigo } from "@/repositories/cest-repositories.js";
import { buscarNcmPorCodigo } from "@/repositories/ncm-repositories.js";
import { buscarUnidadeMedidaPorSigla } from "@/repositories/unidade-medida-repositories.js";
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
) {
	if (idcfopentrada) {
		const dePara = await buscarCfopSaidaPorEntrada(idempresa, idcfopentrada);

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

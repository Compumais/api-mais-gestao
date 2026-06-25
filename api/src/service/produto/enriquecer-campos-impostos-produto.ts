import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import type { CamposImpostosProduto } from "@/util/campos-impostos-produto.js";
import { montarCamposImpostosProduto } from "@/util/campos-impostos-produto.js";
import {
	codigoCfopParaInteiro,
	obterTributacaoPadraoCfopSaida,
} from "@/util/preencher-tributacao-produto-cfop.js";

export async function enriquecerCamposImpostosProduto(
	dados: CamposImpostosProduto,
): Promise<CamposImpostosProduto> {
	const campos = montarCamposImpostosProduto(dados);

	if (campos.idcfopsaidanfce && !campos.cfopvendaecf) {
		const cfopEcf = await buscarCfopPorId(campos.idcfopsaidanfce);
		if (cfopEcf) {
			campos.cfopvendaecf = codigoCfopParaInteiro(cfopEcf.codigo);
		}
	}

	if (!campos.idcfopsaidanfce && campos.idcfopsaida) {
		campos.idcfopsaidanfce = campos.idcfopsaida;
		const cfopSaida = await buscarCfopPorId(campos.idcfopsaida);
		if (cfopSaida) {
			campos.cfopvendaecf = codigoCfopParaInteiro(cfopSaida.codigo);
		}
	}

	return campos;
}

export async function obterTributacaoSugeridaPorCfop(
	idempresa: string,
	idcfop: string,
) {
	const cfop = await buscarCfopPorId(idcfop);

	if (!cfop || cfop.idempresa !== idempresa) {
		return null;
	}

	return obterTributacaoPadraoCfopSaida(cfop);
}

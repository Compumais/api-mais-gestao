import type { TributacaoImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import type { ConfigRegimeImportacaoNf } from "@/util/regime-tributario-empresa.js";
import { truncarTexto } from "@/util/texto-util.js";

export type SugestaoTributacaoSaidaProduto = {
	situacaotributariasn?: string | undefined;
	cstpis?: string | undefined;
	cstcofins?: string | undefined;
};

const CSOSN_SAIDA_PADRAO_SN = "102";
const CST_SAIDA_PADRAO_LP_LR = "00";
const CST_PIS_COFINS_SAIDA_PADRAO = "01";

function ehCsosn(codigo?: string): boolean {
	if (!codigo) return false;
	const valor = codigo.trim();
	return valor.length === 3 && (valor.startsWith("1") || valor.startsWith("2") || valor.startsWith("5") || valor.startsWith("9"));
}

function mapearCsosnEntradaParaSaida(csosnEntrada: string): string {
	const mapa: Record<string, string> = {
		"101": "101",
		"102": "102",
		"103": "103",
		"201": "201",
		"202": "202",
		"203": "203",
		"300": "300",
		"400": "400",
		"500": "500",
		"900": "900",
	};

	return mapa[csosnEntrada] ?? CSOSN_SAIDA_PADRAO_SN;
}

function mapearCstIcmsEntradaParaSaida(cstEntrada: string): string {
	const prefixo = cstEntrada.trim().padStart(2, "0").slice(0, 2);

	if (["00", "10", "20", "51", "70", "90"].includes(prefixo)) {
		return CST_SAIDA_PADRAO_LP_LR;
	}

	return prefixo;
}

export function sugerirTributacaoSaidaProdutoNf(
	config: ConfigRegimeImportacaoNf,
	tributacao: TributacaoImportacaoItem,
): SugestaoTributacaoSaidaProduto {
	const situacaoEntrada = tributacao.situacaotributaria?.trim();

	let situacaotributariasn: string | undefined;

	if (config.usarCsosn) {
		if (situacaoEntrada && ehCsosn(situacaoEntrada)) {
			situacaotributariasn = mapearCsosnEntradaParaSaida(situacaoEntrada);
		} else {
			situacaotributariasn = CSOSN_SAIDA_PADRAO_SN;
		}
	} else if (situacaoEntrada) {
		situacaotributariasn = mapearCstIcmsEntradaParaSaida(situacaoEntrada);
	} else {
		situacaotributariasn = CST_SAIDA_PADRAO_LP_LR;
	}

	const cstpis =
		truncarTexto(tributacao.cstpis, 2) ?? CST_PIS_COFINS_SAIDA_PADRAO;
	const cstcofins =
		truncarTexto(tributacao.cstcofins, 2) ?? CST_PIS_COFINS_SAIDA_PADRAO;

	return {
		situacaotributariasn: truncarTexto(situacaotributariasn, 3) ?? undefined,
		cstpis,
		cstcofins,
	};
}

export function mesclarSugestaoTributacaoSaidaProduto(
	produtoAtual: {
		situacaotributariasn?: string | null | undefined;
		cstpis?: string | null | undefined;
		cstcofins?: string | null | undefined;
	},
	sugestao: SugestaoTributacaoSaidaProduto,
): Partial<{
	situacaotributariasn: string;
	cstpis: string;
	cstcofins: string;
}> {
	const resultado: Partial<{
		situacaotributariasn: string;
		cstpis: string;
		cstcofins: string;
	}> = {};

	if (!produtoAtual.situacaotributariasn?.trim() && sugestao.situacaotributariasn) {
		resultado.situacaotributariasn = sugestao.situacaotributariasn;
	}

	if (!produtoAtual.cstpis?.toString().trim() && sugestao.cstpis) {
		resultado.cstpis = sugestao.cstpis;
	}

	if (!produtoAtual.cstcofins?.toString().trim() && sugestao.cstcofins) {
		resultado.cstcofins = sugestao.cstcofins;
	}

	return resultado;
}

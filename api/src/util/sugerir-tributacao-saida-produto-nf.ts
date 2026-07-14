import type { TributacaoImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import { campoTributacaoAusenteOuInvalido } from "@/util/parametrizacao-tributos-matching.js";
import type { ConfigRegimeImportacaoNf } from "@/util/regime-tributario-empresa.js";
import { truncarTexto } from "@/util/texto-util.js";

export type SugestaoTributacaoSaidaProduto = {
	idcfopsaida?: string | undefined;
	idcfopsaidanfce?: string | undefined;
	cfopvendaecf?: number | undefined;
	situacaotributaria?: string | undefined;
	situacaotributariasn?: string | undefined;
	tributacaoespecial?: string | undefined;
	tributacaosn?: string | undefined;
	cstpis?: string | undefined;
	cstcofins?: string | undefined;
	idtaxauf?: string | undefined;
	cstipientrada?: string | undefined;
	cstipisaida?: string | undefined;
	idenquadramentoipi?: string | undefined;
	tipoproduto?: string | undefined;
};

const CSOSN_SAIDA_PADRAO_SN = "102";
const CST_SAIDA_PADRAO_LP_LR = "00";
const CST_PIS_COFINS_SAIDA_PADRAO = "01";

function ehCsosn(codigo?: string): boolean {
	if (!codigo) return false;
	const valor = codigo.trim();
	return (
		valor.length === 3 &&
		(valor.startsWith("1") ||
			valor.startsWith("2") ||
			valor.startsWith("5") ||
			valor.startsWith("9"))
	);
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

	let situacaotributaria: string | undefined;
	let situacaotributariasn: string | undefined;

	if (config.usarCsosn) {
		if (situacaoEntrada && ehCsosn(situacaoEntrada)) {
			situacaotributariasn = mapearCsosnEntradaParaSaida(situacaoEntrada);
		} else {
			situacaotributariasn = CSOSN_SAIDA_PADRAO_SN;
		}
	} else if (situacaoEntrada) {
		situacaotributaria = mapearCstIcmsEntradaParaSaida(situacaoEntrada);
	} else {
		situacaotributaria = CST_SAIDA_PADRAO_LP_LR;
	}

	const cstpis =
		truncarTexto(tributacao.cstpis, 2) ?? CST_PIS_COFINS_SAIDA_PADRAO;
	const cstcofins =
		truncarTexto(tributacao.cstcofins, 2) ?? CST_PIS_COFINS_SAIDA_PADRAO;

	const csosnNaoContrib = situacaotributariasn ?? CSOSN_SAIDA_PADRAO_SN;
	const cstNaoContrib = situacaotributaria ?? CST_SAIDA_PADRAO_LP_LR;

	return {
		situacaotributaria: truncarTexto(situacaotributaria, 3) ?? undefined,
		situacaotributariasn: truncarTexto(situacaotributariasn, 3) ?? undefined,
		tributacaoespecial: truncarTexto(cstNaoContrib, 7) ?? undefined,
		tributacaosn: truncarTexto(csosnNaoContrib, 3) ?? undefined,
		cstpis,
		cstcofins,
	};
}

export function mesclarSugestaoTributacaoSaidaProduto(
	produtoAtual: {
		situacaotributaria?: string | null | undefined;
		situacaotributariasn?: string | null | undefined;
		tributacaoespecial?: string | null | undefined;
		tributacaosn?: string | null | undefined;
		cstpis?: string | null | undefined;
		cstcofins?: string | null | undefined;
		idtaxauf?: string | null | undefined;
		cstipientrada?: string | null | undefined;
		cstipisaida?: string | null | undefined;
		idenquadramentoipi?: string | null | undefined;
	},
	sugestao: SugestaoTributacaoSaidaProduto,
): Partial<{
	situacaotributaria: string;
	situacaotributariasn: string;
	tributacaoespecial: string;
	tributacaosn: string;
	cstpis: string;
	cstcofins: string;
	idtaxauf: string;
	cstipientrada: string;
	cstipisaida: string;
	idenquadramentoipi: string;
}> {
	const resultado: Partial<{
		situacaotributaria: string;
		situacaotributariasn: string;
		tributacaoespecial: string;
		tributacaosn: string;
		cstpis: string;
		cstcofins: string;
		idtaxauf: string;
		cstipientrada: string;
		cstipisaida: string;
		idenquadramentoipi: string;
	}> = {};

	if (
		campoTributacaoAusenteOuInvalido(produtoAtual.situacaotributaria) &&
		sugestao.situacaotributaria
	) {
		resultado.situacaotributaria = sugestao.situacaotributaria;
	}

	if (
		campoTributacaoAusenteOuInvalido(produtoAtual.situacaotributariasn) &&
		sugestao.situacaotributariasn
	) {
		resultado.situacaotributariasn = sugestao.situacaotributariasn;
	}

	if (
		campoTributacaoAusenteOuInvalido(produtoAtual.tributacaoespecial) &&
		sugestao.tributacaoespecial
	) {
		resultado.tributacaoespecial = sugestao.tributacaoespecial;
	}

	if (
		campoTributacaoAusenteOuInvalido(produtoAtual.tributacaosn) &&
		sugestao.tributacaosn
	) {
		resultado.tributacaosn = sugestao.tributacaosn;
	}

	if (
		campoTributacaoAusenteOuInvalido(produtoAtual.cstpis?.toString()) &&
		sugestao.cstpis
	) {
		resultado.cstpis = sugestao.cstpis;
	}

	if (
		campoTributacaoAusenteOuInvalido(produtoAtual.cstcofins?.toString()) &&
		sugestao.cstcofins
	) {
		resultado.cstcofins = sugestao.cstcofins;
	}

	if (!produtoAtual.idtaxauf?.trim() && sugestao.idtaxauf) {
		resultado.idtaxauf = sugestao.idtaxauf;
	}

	if (!produtoAtual.cstipientrada?.trim() && sugestao.cstipientrada) {
		resultado.cstipientrada = sugestao.cstipientrada;
	}

	if (!produtoAtual.cstipisaida?.trim() && sugestao.cstipisaida) {
		resultado.cstipisaida = sugestao.cstipisaida;
	}

	if (!produtoAtual.idenquadramentoipi?.trim() && sugestao.idenquadramentoipi) {
		resultado.idenquadramentoipi = sugestao.idenquadramentoipi;
	}

	return resultado;
}

/**
 * Heurísticas de coerência CFOP de entrada × tributação do XML (compra).
 * ST entrada: 2º dígito = 4 (ex. 1403, 2403).
 * Tributado mercadoria: 2º dígito = 1 (ex. 1102, 2102).
 */

const CST_ST = new Set(["10", "30", "60", "70"]);
const CSOSN_ST = new Set(["201", "202", "203"]);
const CST_TRIBUTADO = new Set(["00", "20"]);
const CSOSN_TRIBUTADO = new Set(["101", "102"]);

export function normalizarCodigoCfop(codigo?: string | null): string {
	return (codigo ?? "").replace(/\D/g, "");
}

export function isCfopEntrada(codigo?: string | null): boolean {
	const digitos = normalizarCodigoCfop(codigo);
	if (digitos.length < 4) return false;
	return digitos[0] === "1" || digitos[0] === "2" || digitos[0] === "3";
}

export function isCfopEntradaSt(codigo?: string | null): boolean {
	const digitos = normalizarCodigoCfop(codigo);
	if (digitos.length < 4 || !isCfopEntrada(digitos)) return false;
	return digitos[1] === "4";
}

export function isCfopEntradaTributado(codigo?: string | null): boolean {
	const digitos = normalizarCodigoCfop(codigo);
	if (digitos.length < 4 || !isCfopEntrada(digitos)) return false;
	return digitos[1] === "1";
}

export function itemTemIndicativoSt(tributacao: {
	icmsst?: string | null | undefined;
	situacaotributaria?: string | null | undefined;
}): boolean {
	const stValor = Number.parseFloat(String(tributacao.icmsst ?? "0").replace(",", "."));
	if (Number.isFinite(stValor) && stValor > 0) return true;

	const sit = String(tributacao.situacaotributaria ?? "").replace(/\D/g, "");
	if (!sit) return false;
	if (CST_ST.has(sit.padStart(2, "0").slice(-2))) return true;
	if (CSOSN_ST.has(sit)) return true;
	return false;
}

export function itemTemIndicativoTributado(tributacao: {
	icmsst?: string | null | undefined;
	situacaotributaria?: string | null | undefined;
	icms?: string | null | undefined;
}): boolean {
	if (itemTemIndicativoSt(tributacao)) return false;

	const sit = String(tributacao.situacaotributaria ?? "").replace(/\D/g, "");
	if (CST_TRIBUTADO.has(sit.padStart(2, "0").slice(-2))) return true;
	if (CSOSN_TRIBUTADO.has(sit)) return true;

	const icms = Number.parseFloat(String(tributacao.icms ?? "0").replace(",", "."));
	return Number.isFinite(icms) && icms > 0;
}

export type InconsistenciaCfopEntrada =
	| "cfop_obrigatorio"
	| "cfop_nao_entrada"
	| "st_com_cfop_tributado"
	| "tributado_com_cfop_st";

export function validarCoerenciaCfopEntradaItem(params: {
	codigoCfopEntrada?: string | null | undefined;
	idcfop?: string | null | undefined;
	tributacao: {
		icmsst?: string | null | undefined;
		situacaotributaria?: string | null | undefined;
		icms?: string | null | undefined;
	};
}): InconsistenciaCfopEntrada | null {
	if (!params.idcfop) {
		return "cfop_obrigatorio";
	}

	const codigo = params.codigoCfopEntrada;
	if (codigo && !isCfopEntrada(codigo)) {
		return "cfop_nao_entrada";
	}

	const temSt = itemTemIndicativoSt(params.tributacao);
	const temTrib = itemTemIndicativoTributado(params.tributacao);

	if (temSt && codigo && isCfopEntradaTributado(codigo)) {
		return "st_com_cfop_tributado";
	}

	if (temTrib && codigo && isCfopEntradaSt(codigo)) {
		return "tributado_com_cfop_st";
	}

	return null;
}

export function mensagemInconsistenciaCfopEntrada(
	tipo: InconsistenciaCfopEntrada,
): string {
	switch (tipo) {
		case "cfop_obrigatorio":
			return "CFOP de entrada não informado";
		case "cfop_nao_entrada":
			return "CFOP selecionado não é de entrada (deve iniciar com 1, 2 ou 3)";
		case "st_com_cfop_tributado":
			return "Item com ICMS ST / CST ST exige CFOP de entrada da família ST (ex. 1403/2403)";
		case "tributado_com_cfop_st":
			return "Item tributado sem ST não deve usar CFOP de entrada ST (ex. 1403)";
		default:
			return "CFOP de entrada inconsistente";
	}
}

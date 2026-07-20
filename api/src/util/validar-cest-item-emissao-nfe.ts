import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

const CST_COM_ST = new Set(["10", "30", "60", "70"]);
const CSOSN_COM_ST = new Set(["201", "202", "203", "500"]);

/** Retorna CEST com 7 dígitos ou undefined se incompleto/inválido. */
export function normalizarCodigoCest(
	valor?: string | number | null,
): string | undefined {
	if (valor == null) return undefined;
	const digitos = String(valor).replace(/\D/g, "");
	if (digitos.length === 7) return digitos;
	// Campo legado numérico no produto pode perder zeros à esquerda.
	if (
		typeof valor === "number" &&
		digitos.length > 0 &&
		digitos.length < 7
	) {
		return digitos.padStart(7, "0");
	}
	return undefined;
}

export function itemEmissaoRequerCest(item: ItemPayloadNfe): boolean {
	const cst = item.cst?.replace(/\D/g, "") ?? "";
	const csosn = item.csosn?.replace(/\D/g, "") ?? "";

	if (CST_COM_ST.has(cst) || CSOSN_COM_ST.has(csosn)) {
		return true;
	}

	const baseSt = item.baseIcmsSt ?? 0;
	const valorSt = item.valorIcmsSt ?? 0;
	return baseSt > 0 || valorSt > 0;
}

export function validarCestItensEmissaoNfe(
	itens: ItemPayloadNfe[],
): string[] {
	const pendencias: string[] = [];

	for (const [index, item] of itens.entries()) {
		if (!itemEmissaoRequerCest(item)) continue;

		const cest = normalizarCodigoCest(item.cest);
		if (cest) continue;

		pendencias.push(
			`Item ${index + 1}: operação com ICMS-ST exige CEST (7 dígitos). Informe o CEST no item ou no cadastro do produto.`,
		);
	}

	return pendencias;
}

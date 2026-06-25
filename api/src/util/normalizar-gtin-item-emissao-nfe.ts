import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

function sanitizarGtin(valor?: string | number | null): string | undefined {
	if (valor == null) return undefined;
	const digitos = String(valor).replace(/\D/g, "").trim();
	return digitos || undefined;
}

function ehSemGtin(valor?: string | null): boolean {
	const texto = valor?.trim();
	if (!texto) return true;
	return texto.toUpperCase() === "SEM GTIN";
}

export function normalizarGtinItemEmissao(
	item: ItemPayloadNfe,
): ItemPayloadNfe {
	const ean = sanitizarGtin(item.ean);
	if (!ean || ehSemGtin(ean)) {
		return {
			...item,
			ean: undefined,
			eanTributavel: undefined,
		};
	}

	const eanTributavel =
		sanitizarGtin(item.eanTributavel) ??
		(ehSemGtin(item.eanTributavel) ? ean : undefined) ??
		ean;

	return {
		...item,
		ean,
		eanTributavel,
	};
}

export function normalizarGtinItensEmissao(
	itens: ItemPayloadNfe[],
): ItemPayloadNfe[] {
	return itens.map(normalizarGtinItemEmissao);
}

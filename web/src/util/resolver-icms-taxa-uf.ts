import type { TaxaUf } from "@/services/taxauf.service";

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

export function resolverAliquotaIcmsTaxaUf(
	taxa: TaxaUf,
	uf?: string | null,
): number | undefined {
	if (!uf?.trim()) return undefined;

	const campo = `uf_${uf.trim().toLowerCase()}` as keyof TaxaUf;
	const valor = taxa[campo];
	if (valor == null || valor === "") return undefined;

	const numero = Number(valor);
	return Number.isFinite(numero) ? numero : undefined;
}

export function resolverBaseIcmsTaxaUf(
	taxa: TaxaUf,
	valorProduto: number,
): number {
	const percentualBase =
		taxa.baseicms != null && taxa.baseicms !== ""
			? Number(taxa.baseicms)
			: 100;

	const fator = Number.isFinite(percentualBase) ? percentualBase / 100 : 1;
	return round2(valorProduto * fator);
}

export function resolverIcmsItemDeTaxaUf(
	taxa: TaxaUf,
	uf: string | null | undefined,
	valorProduto: number,
): { baseIcms: number; aliquotaIcms?: number } {
	const baseIcms = resolverBaseIcmsTaxaUf(taxa, valorProduto);
	const aliquotaIcms = resolverAliquotaIcmsTaxaUf(taxa, uf);

	return {
		baseIcms,
		...(aliquotaIcms !== undefined ? { aliquotaIcms } : {}),
	};
}

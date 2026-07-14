/** Códigos SPED 0200 — tipo do item (tipoproduto). */
export const TIPOS_PRODUTO_SPED = [
	{ codigo: "00", label: "Material para revenda" },
	{ codigo: "01", label: "Matéria-prima" },
	{ codigo: "02", label: "Embalagem" },
	{ codigo: "03", label: "Produto processado (em processo)" },
	{ codigo: "04", label: "Produto acabado" },
	{ codigo: "05", label: "Subproduto" },
	{ codigo: "06", label: "Produto intermediário" },
	{ codigo: "07", label: "Material de uso e consumo" },
	{ codigo: "09", label: "Serviço" },
	{ codigo: "10", label: "Outros insumos" },
	{ codigo: "99", label: "Outras" },
] as const;

export type CodigoTipoProdutoSped =
	(typeof TIPOS_PRODUTO_SPED)[number]["codigo"];

export const TIPOS_PRODUTO_SPED_MAP: Record<string, string> =
	Object.fromEntries(
		TIPOS_PRODUTO_SPED.map((item) => [item.codigo, item.label]),
	);

export const OPCOES_TIPO_PRODUTO = TIPOS_PRODUTO_SPED.map((item) => ({
	value: item.codigo,
	label: `${item.codigo} — ${item.label}`,
}));

export function obterLabelTipoProduto(
	codigo: string | null | undefined,
): string {
	if (!codigo) return "-";
	const label = TIPOS_PRODUTO_SPED_MAP[codigo];
	return label ? `${codigo} — ${label}` : codigo;
}

/**
 * Sugestão de tipoproduto ao criar natureza (CFOP) ou ao selecionar CFOP de entrada.
 * Fallback padrão: 00 (mercadoria para revenda).
 */
export function sugerirTipoprodutoPorCodigoCfop(
	codigo: string | null | undefined,
): CodigoTipoProdutoSped {
	if (!codigo) return "00";

	const digits = codigo.replace(/\D/g, "");
	if (!digits) return "00";

	if (digits === "1101" || digits === "2101") return "01";
	if (
		digits === "1102" ||
		digits === "1403" ||
		digits === "2102" ||
		digits === "2403"
	) {
		return "00";
	}
	if (digits === "1556" || digits === "1407" || digits === "2556") {
		return "07";
	}

	return "00";
}

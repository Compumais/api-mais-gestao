type CondicaoParcelas = {
	parcelas?: number | null;
	prazos?: string | null;
};

export function parsePrazosCondicaoPagamento(prazosStr?: string | null): number[] {
	const prazos = (prazosStr ?? "0")
		.split(",")
		.map((p) => parseInt(p.trim(), 10))
		.filter((p) => !Number.isNaN(p));

	return prazos.length > 0 ? prazos : [0];
}

/**
 * N parcelas cadastradas na condição = N títulos financeiros.
 * Prazos extras (ex.: entrada + parcelas) são ignorados além de `parcelas`.
 */
export function resolverParcelasCondicaoPagamento(condicao: CondicaoParcelas): {
	totalParcelas: number;
	prazosDias: number[];
} {
	const totalParcelas = Math.max(condicao.parcelas ?? 1, 1);
	const prazos = parsePrazosCondicaoPagamento(condicao.prazos);

	const prazosDias = Array.from({ length: totalParcelas }, (_, i) =>
		prazos[i] !== undefined ? prazos[i]! : (i + 1) * 30,
	);

	return { totalParcelas, prazosDias };
}

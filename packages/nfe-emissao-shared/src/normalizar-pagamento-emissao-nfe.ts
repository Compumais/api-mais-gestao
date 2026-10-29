export function montarPagamentoEmissaoNfe(
	tPag: string,
	totalNota: number,
	opcoes?: { forcarSemPagamento?: boolean },
): { formas: Array<{ tPag: string; vPag: number }> } {
	const forma = opcoes?.forcarSemPagamento || tPag === "90" ? "90" : tPag;

	if (forma === "90") {
		return { formas: [{ tPag: "90", vPag: 0 }] };
	}

	return { formas: [{ tPag: forma, vPag: totalNota }] };
}

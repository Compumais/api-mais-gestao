export const TPAG_CARTAO_CREDITO = "03";
export const TPAG_CARTAO_DEBITO = "04";

export type CardPagamentoNfce = {
	tpIntegra: 1 | 2;
	CNPJ?: string;
	tBand?: string;
	cAut?: string;
};

export function exigeGrupoCard(tPag: string): boolean {
	return tPag === TPAG_CARTAO_CREDITO || tPag === TPAG_CARTAO_DEBITO;
}

/**
 * Pagamento sem integração TEF (POS manual): basta tpIntegra=2 no grupo card.
 * Com TEF (tpIntegra=1), informar CNPJ da credenciadora, bandeira e autorização.
 */
export function montarCardPagamentoNfce(
	opcoes?: Partial<CardPagamentoNfce>,
): CardPagamentoNfce {
	const tpIntegra = opcoes?.tpIntegra ?? 2;

	if (tpIntegra === 2) {
		return { tpIntegra: 2 };
	}

	return {
		tpIntegra: 1,
		tBand: opcoes?.tBand ?? "99",
		...(opcoes?.CNPJ ? { CNPJ: opcoes.CNPJ } : {}),
		...(opcoes?.cAut ? { cAut: opcoes.cAut } : {}),
	};
}

export function complementarCardPagamentoNfe<T extends { tPag: string; card?: CardPagamentoNfce }>(
	forma: T,
): T {
	if (!exigeGrupoCard(forma.tPag) || forma.card) {
		return forma;
	}

	return {
		...forma,
		card: montarCardPagamentoNfce(),
	};
}

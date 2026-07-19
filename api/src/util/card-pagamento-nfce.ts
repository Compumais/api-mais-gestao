export const TPAG_CARTAO_CREDITO = "03";
export const TPAG_CARTAO_DEBITO = "04";
export const TPAG_BOLETO = "15";
export const TPAG_PIX = "17";

/**
 * Meios eletrônicos que exigem o grupo YA04 (card) no XML da NFC-e/NF-e.
 * NT 2015.002 (cartão) + NT 2023.004 / 2024.003 (PIX, boleto e afins).
 */
const TPAGS_COM_GRUPO_CARD = new Set([
	TPAG_CARTAO_CREDITO,
	TPAG_CARTAO_DEBITO,
	TPAG_BOLETO,
	TPAG_PIX,
]);

export type CardPagamentoNfce = {
	tpIntegra: 1 | 2;
	CNPJ?: string;
	tBand?: string;
	cAut?: string;
};

export function normalizarTPag(tPag: string | number | null | undefined): string {
	const digits = String(tPag ?? "")
		.replace(/\D/g, "")
		.slice(-2);
	if (!digits) return "01";
	return digits.padStart(2, "0");
}

export function exigeGrupoCard(tPag: string | number | null | undefined): boolean {
	return TPAGS_COM_GRUPO_CARD.has(normalizarTPag(tPag));
}

/**
 * Pagamento sem integração TEF (POS manual / PIX avulso): basta tpIntegra=2.
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

export function complementarCardPagamentoNfe<
	T extends { tPag: string; card?: CardPagamentoNfce },
>(forma: T): T {
	const tPag = normalizarTPag(forma.tPag);
	const base = { ...forma, tPag };

	if (!exigeGrupoCard(tPag) || base.card) {
		return base;
	}

	return {
		...base,
		card: montarCardPagamentoNfce(),
	};
}

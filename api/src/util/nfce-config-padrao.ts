/** Valores técnicos NFC-e modelo 65 — definidos pelo sistema, não pelo usuário. */

export const NFCE_CONFIG_PADRAO = {
	versaoleiaute: "4.00",
	/** PL_010+ (NT 2025.002) — necessário para grupo IBSCBS no XML. */
	schema: "PL_010_V1.30",
	verproc: "MaisGestao 1.0.0",
} as const;

export type MeioPagamentoPdv = "dinheiro" | "cartao" | "pix" | "prepago";

export type MeiosPagamentoNfceConfig = Record<MeioPagamentoPdv, boolean>;

export const MEIOS_PAGAMENTO_NFCE_PADRAO: MeiosPagamentoNfceConfig = {
	dinheiro: true,
	cartao: true,
	pix: true,
	prepago: false,
};

export function normalizarMeiosPagamentoNfce(
	valor: Partial<MeiosPagamentoNfceConfig> | null | undefined,
): MeiosPagamentoNfceConfig {
	return {
		dinheiro: valor?.dinheiro ?? MEIOS_PAGAMENTO_NFCE_PADRAO.dinheiro,
		cartao: valor?.cartao ?? MEIOS_PAGAMENTO_NFCE_PADRAO.cartao,
		pix: valor?.pix ?? MEIOS_PAGAMENTO_NFCE_PADRAO.pix,
		prepago: valor?.prepago ?? MEIOS_PAGAMENTO_NFCE_PADRAO.prepago,
	};
}

export function aplicarPadroesTecnicosNfce<T extends Record<string, unknown>>(
	dados: T,
): T & typeof NFCE_CONFIG_PADRAO {
	return {
		...dados,
		versaoleiaute: NFCE_CONFIG_PADRAO.versaoleiaute,
		schema: NFCE_CONFIG_PADRAO.schema,
		verproc: NFCE_CONFIG_PADRAO.verproc,
	};
}

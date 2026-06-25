/** Valores técnicos NFC-e modelo 65 — definidos pelo sistema, não pelo usuário. */

export const NFCE_CONFIG_PADRAO = {
	versaoleiaute: "4.00",
	schema: "PL_009_V4",
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

export function aplicarPadroesTecnicosNfce<
	T extends {
		versaoleiaute?: string;
		schema?: string;
		verproc?: string | null;
	},
>(dados: T): T & typeof NFCE_CONFIG_PADRAO {
	return {
		...dados,
		versaoleiaute: NFCE_CONFIG_PADRAO.versaoleiaute,
		schema: NFCE_CONFIG_PADRAO.schema,
		verproc: NFCE_CONFIG_PADRAO.verproc,
	};
}

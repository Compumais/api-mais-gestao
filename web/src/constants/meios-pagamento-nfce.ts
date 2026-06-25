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

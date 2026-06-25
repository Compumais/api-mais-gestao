export type MeioPagamentoPdv =
	| "dinheiro"
	| "cartao_credito"
	| "cartao_debito"
	| "pix"
	| "prepago";

export type MeiosPagamentoNfceConfig = {
	dinheiro: boolean;
	cartao: boolean;
	pix: boolean;
	prepago: boolean;
};

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

export function resolverValorMeioPagamentoNfce(
	config: Partial<MeiosPagamentoNfceConfig> | null | undefined,
	meio: MeioPagamentoPdv,
): boolean {
	const normalizado = normalizarMeiosPagamentoNfce(config);
	if (meio === "cartao_credito" || meio === "cartao_debito") {
		return normalizado.cartao;
	}
	return normalizado[meio];
}

export function atualizarMeioPagamentoNfce(
	config: Partial<MeiosPagamentoNfceConfig> | null | undefined,
	meio: MeioPagamentoPdv,
	habilitado: boolean,
): MeiosPagamentoNfceConfig {
	const atual = normalizarMeiosPagamentoNfce(config);
	if (meio === "cartao_credito" || meio === "cartao_debito") {
		return { ...atual, cartao: habilitado };
	}
	return { ...atual, [meio]: habilitado };
}

export type MeioPagamentoNfce = "dinheiro" | "cartao" | "pix" | "prepago";

export type MeiosPagamentoNfceConfig = Record<MeioPagamentoNfce, boolean>;

export type ResumoPagamentoNfce = {
	dinheiro: number;
	cartao: number;
	pix: number;
	prepago: number;
};

export const MEIOS_PAGAMENTO_NFCE_PADRAO: MeiosPagamentoNfceConfig = {
	dinheiro: true,
	cartao: true,
	pix: true,
	prepago: false,
};

const CHAVE_CONFIG = "nfce_meios_pagamento";

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

export function parseMeiosPagamentoNfceConfig(
	valor: string | null | undefined,
): MeiosPagamentoNfceConfig {
	if (!valor?.trim()) {
		return { ...MEIOS_PAGAMENTO_NFCE_PADRAO };
	}
	try {
		const parsed = JSON.parse(valor) as Partial<MeiosPagamentoNfceConfig>;
		return normalizarMeiosPagamentoNfce(parsed);
	} catch {
		return { ...MEIOS_PAGAMENTO_NFCE_PADRAO };
	}
}

export function serializarMeiosPagamentoNfceConfig(
	valor: Partial<MeiosPagamentoNfceConfig> | null | undefined,
): string {
	return JSON.stringify(normalizarMeiosPagamentoNfce(valor));
}

export function resumoPagamentoParaNfce(params: {
	valordinheiro?: number;
	valorpix?: number;
	valorcartaocredito?: number;
	valorcartaodebito?: number;
	valorcartao?: number;
	valorprepago?: number;
	valortroco?: number;
}): ResumoPagamentoNfce {
	const dinheiroBruto = Number(params.valordinheiro ?? 0);
	const troco = Number(params.valortroco ?? 0);
	const cartao =
		Number(params.valorcartaocredito ?? 0) +
		Number(params.valorcartaodebito ?? 0) +
		Number(params.valorcartao ?? 0);
	return {
		dinheiro: Math.max(0, dinheiroBruto - troco),
		cartao,
		pix: Number(params.valorpix ?? 0),
		prepago: Number(params.valorprepago ?? 0),
	};
}

export function avaliarEmissaoNfcePorPagamento(
	resumo: ResumoPagamentoNfce,
	config: MeiosPagamentoNfceConfig,
): { deveEmitir: boolean; meiosUtilizados: MeioPagamentoNfce[] } {
	const meiosUtilizados: MeioPagamentoNfce[] = [];
	if (resumo.dinheiro > 0.009) meiosUtilizados.push("dinheiro");
	if (resumo.cartao > 0.009) meiosUtilizados.push("cartao");
	if (resumo.pix > 0.009) meiosUtilizados.push("pix");
	if (resumo.prepago > 0.009) meiosUtilizados.push("prepago");
	return {
		deveEmitir: meiosUtilizados.some((meio) => config[meio] === true),
		meiosUtilizados,
	};
}

export const CHAVE_CONFIG_MEIOS_NFCE = CHAVE_CONFIG;

import {
	MEIOS_PAGAMENTO_PDV,
	type PagamentosFechar,
} from "@/lib/gourmet-utils";
import {
	type MeioPagamentoPdv,
	type MeiosPagamentoNfceConfig,
	normalizarMeiosPagamentoNfce,
} from "@/constants/meios-pagamento-nfce";

export type ResultadoAvaliacaoEmissaoNfce = {
	deveEmitir: boolean;
	meiosUtilizados: MeioPagamentoPdv[];
};

function parseValor(valor?: string | null): number {
	if (!valor) return 0;
	const n = Number.parseFloat(valor.replace(",", "."));
	return Number.isNaN(n) ? 0 : n;
}

export function extrairMeiosPagamentoUtilizados(
	pagamentos: PagamentosFechar & { valortroco?: string | null },
): MeioPagamentoPdv[] {
	const troco = parseValor(pagamentos.valortroco);
	const dinheiroBruto = parseValor(pagamentos.valordinheiro);
	const dinheiro = Math.max(0, dinheiroBruto - troco);

	let cartaoCredito = parseValor(pagamentos.valorcartaocredito);
	const cartaoDebito = parseValor(pagamentos.valorcartaodebito);
	if (cartaoCredito === 0 && cartaoDebito === 0) {
		cartaoCredito = parseValor(pagamentos.valorcartao);
	}

	const valores: Record<MeioPagamentoPdv, number> = {
		dinheiro,
		cartao_credito: cartaoCredito,
		cartao_debito: cartaoDebito,
		pix: parseValor(pagamentos.valorpix),
		prepago: parseValor(pagamentos.valorprepago),
	};

	return MEIOS_PAGAMENTO_PDV.filter((meio) => {
		if (meio.id === "cartao_credito" || meio.id === "cartao_debito") {
			return valores[meio.id] > 0;
		}
		if (meio.id === "dinheiro") return valores.dinheiro > 0;
		if (meio.id === "pix") return valores.pix > 0;
		if (meio.id === "prepago") return valores.prepago > 0;
		return false;
	}).map((meio) => meio.id);
}

function meioHabilitaNfce(
	meio: MeioPagamentoPdv,
	config: MeiosPagamentoNfceConfig,
): boolean {
	if (meio === "cartao_credito" || meio === "cartao_debito") {
		return config.cartao;
	}
	return config[meio];
}

export function avaliarEmissaoNfcePorPagamento(
	pagamentos: PagamentosFechar & { valortroco?: string | null },
	config: Partial<MeiosPagamentoNfceConfig> | null | undefined,
): ResultadoAvaliacaoEmissaoNfce {
	const meiosConfig = normalizarMeiosPagamentoNfce(config);
	const meiosUtilizados = extrairMeiosPagamentoUtilizados(pagamentos);
	const deveEmitir = meiosUtilizados.some((meio) =>
		meioHabilitaNfce(meio, meiosConfig),
	);

	return { deveEmitir, meiosUtilizados };
}

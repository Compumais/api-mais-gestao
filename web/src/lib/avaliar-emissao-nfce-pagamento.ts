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

	const valores: Record<MeioPagamentoPdv, number> = {
		dinheiro,
		cartao: parseValor(pagamentos.valorcartao),
		pix: parseValor(pagamentos.valorpix),
		prepago: parseValor(pagamentos.valorprepago),
	};

	return MEIOS_PAGAMENTO_PDV.filter((meio) => valores[meio.id] > 0).map(
		(meio) => meio.id,
	);
}

export function avaliarEmissaoNfcePorPagamento(
	pagamentos: PagamentosFechar & { valortroco?: string | null },
	config: Partial<MeiosPagamentoNfceConfig> | null | undefined,
): ResultadoAvaliacaoEmissaoNfce {
	const meiosConfig = normalizarMeiosPagamentoNfce(config);
	const meiosUtilizados = extrairMeiosPagamentoUtilizados(pagamentos);
	const deveEmitir = meiosUtilizados.some((meio) => meiosConfig[meio] === true);

	return { deveEmitir, meiosUtilizados };
}

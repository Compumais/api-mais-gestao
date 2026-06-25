import type { MeioPagamentoPdv, MeiosPagamentoNfceConfig } from "@/util/nfce-config-padrao.js";
import {
	extrairPagamentosResumo,
	type PagamentosRegistro,
} from "@/util/pagamentos-pdv-util.js";

export type ResultadoAvaliacaoEmissaoNfce = {
	deveEmitir: boolean;
	meiosUtilizados: MeioPagamentoPdv[];
};

const MEIOS_ORDEM: MeioPagamentoPdv[] = [
	"dinheiro",
	"cartao",
	"pix",
	"prepago",
];

export function extrairMeiosPagamentoUtilizados(
	pagamentos: PagamentosRegistro,
): MeioPagamentoPdv[] {
	const resumo = extrairPagamentosResumo(pagamentos);

	return MEIOS_ORDEM.filter((meio) => resumo[meio] > 0);
}

export function avaliarEmissaoNfcePorPagamento(
	pagamentos: PagamentosRegistro,
	config: MeiosPagamentoNfceConfig,
): ResultadoAvaliacaoEmissaoNfce {
	const meiosUtilizados = extrairMeiosPagamentoUtilizados(pagamentos);
	const deveEmitir = meiosUtilizados.some((meio) => config[meio] === true);

	return { deveEmitir, meiosUtilizados };
}

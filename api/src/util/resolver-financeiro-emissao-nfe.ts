import type { TipoDocumentoFinanceiro } from "@/model/tipo-documento-financeiro-model.js";

export type DestinoFinanceiroFormaPagamento =
	| "contas_receber"
	| "caixa_imediato"
	| "titulo_vista";

export function resolverDestinoFinanceiroFormaPagamento(
	tipoDocumento: Pick<
		TipoDocumentoFinanceiro,
		"aprazo" | "integracaixabanco"
	>,
	indPag?: number,
): DestinoFinanceiroFormaPagamento {
	const aPrazo = tipoDocumento.aprazo === 1 || indPag === 1;

	if (aPrazo) {
		return "contas_receber";
	}

	if (tipoDocumento.integracaixabanco === 1) {
		return "caixa_imediato";
	}

	return "titulo_vista";
}

export function resolverPrazoDiasTipoDocumento(
	tipoDocumento: Pick<TipoDocumentoFinanceiro, "prazodias" | "aprazo">,
	fallback = 30,
): number {
	if (tipoDocumento.aprazo !== 1) {
		return 0;
	}

	if (tipoDocumento.prazodias != null && tipoDocumento.prazodias > 0) {
		return tipoDocumento.prazodias;
	}

	return fallback;
}

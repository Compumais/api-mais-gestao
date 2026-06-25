import type { PagamentoPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { complementarCardPagamentoNfe } from "@/util/card-pagamento-nfce.js";
import { FIN_NFE_DEVOLUCAO } from "@/util/cfop-devolucao-emissao-nfe.js";

const TPAG_SEM_PAGAMENTO = "90";

export function normalizarPagamentoEmissaoNfe(
	pagamento: PagamentoPayloadNfe | undefined,
	opcoes?: {
		finNFe?: number;
		valorNota?: number;
	},
): PagamentoPayloadNfe {
	const valorNota = opcoes?.valorNota ?? 0;
	const forcarSemPagamento = opcoes?.finNFe === FIN_NFE_DEVOLUCAO;

	const formas =
		pagamento?.formas?.length && pagamento.formas.length > 0
			? pagamento.formas
			: [{ tPag: forcarSemPagamento ? TPAG_SEM_PAGAMENTO : "01", vPag: valorNota }];

	return {
		formas: formas.map((forma) => {
			const tPag = forcarSemPagamento ? TPAG_SEM_PAGAMENTO : forma.tPag;

			if (tPag === TPAG_SEM_PAGAMENTO) {
				return { tPag: TPAG_SEM_PAGAMENTO, vPag: 0 };
			}

			return complementarCardPagamentoNfe({
				...forma,
				tPag,
				vPag: forma.vPag ?? valorNota,
			});
		}),
	};
}

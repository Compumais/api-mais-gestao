import { extrairPagamentosResumo, type PagamentosRegistro } from "@/util/pagamentos-pdv-util.js";
import type { PagamentoPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

const TPAG_DINHEIRO = "01";
const TPAG_CARTAO_CREDITO = "03";
const TPAG_PIX = "17";
const TPAG_OUTROS = "99";

export function montarPagamentosPdvParaNfce(
	pagamentos: PagamentosRegistro,
	valorTotal: number,
): PagamentoPayloadNfe {
	const resumo = extrairPagamentosResumo(pagamentos);
	const formas: PagamentoPayloadNfe["formas"] = [];

	if (resumo.dinheiro > 0) {
		formas.push({ tPag: TPAG_DINHEIRO, vPag: resumo.dinheiro });
	}
	if (resumo.cartao > 0) {
		formas.push({ tPag: TPAG_CARTAO_CREDITO, vPag: resumo.cartao });
	}
	if (resumo.pix > 0) {
		formas.push({ tPag: TPAG_PIX, vPag: resumo.pix });
	}
	if (resumo.prepago > 0) {
		formas.push({ tPag: TPAG_OUTROS, vPag: resumo.prepago });
	}

	if (formas.length === 0 && valorTotal > 0) {
		formas.push({ tPag: TPAG_DINHEIRO, vPag: valorTotal });
	}

	return { formas };
}

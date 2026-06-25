import {
	complementarCardPagamentoNfe,
	montarCardPagamentoNfce,
	TPAG_CARTAO_CREDITO,
	TPAG_CARTAO_DEBITO,
} from "@/util/card-pagamento-nfce.js";
import { extrairPagamentosResumo, type PagamentosRegistro } from "@/util/pagamentos-pdv-util.js";
import type { PagamentoPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

const TPAG_DINHEIRO = "01";
const TPAG_PIX = "17";
const TPAG_OUTROS = "99";

function parseValorPagamento(valor: string | null | undefined): number {
	if (!valor) return 0;
	const numero = Number.parseFloat(valor.replace(",", "."));
	return Number.isNaN(numero) ? 0 : numero;
}

function adicionarCartao(
	formas: PagamentoPayloadNfe["formas"],
	tPag: string,
	valor: number,
) {
	if (valor <= 0) return;

	formas.push(
		complementarCardPagamentoNfe({
			tPag,
			vPag: valor,
			card: montarCardPagamentoNfce(),
		}),
	);
}

export function montarPagamentosPdvParaNfce(
	pagamentos: PagamentosRegistro,
	valorTotal: number,
): PagamentoPayloadNfe {
	const resumo = extrairPagamentosResumo(pagamentos);
	const formas: PagamentoPayloadNfe["formas"] = [];

	const credito = parseValorPagamento(pagamentos.valorcartaocredito);
	const debito = parseValorPagamento(pagamentos.valorcartaodebito);
	const cartaoLegado =
		credito > 0 || debito > 0 ? 0 : resumo.cartao;

	if (resumo.dinheiro > 0) {
		formas.push({ tPag: TPAG_DINHEIRO, vPag: resumo.dinheiro });
	}

	if (credito > 0) {
		adicionarCartao(formas, TPAG_CARTAO_CREDITO, credito);
	} else if (cartaoLegado > 0) {
		adicionarCartao(formas, TPAG_CARTAO_CREDITO, cartaoLegado);
	}

	if (debito > 0) {
		adicionarCartao(formas, TPAG_CARTAO_DEBITO, debito);
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

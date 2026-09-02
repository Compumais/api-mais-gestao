import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calcularAcrescimoInformado,
	calcularDescontoInformado,
	ehPagamentoAPrazo,
	meioDaFormaNfe,
	meioNativoDaFormaNfe,
	montarBotoesMeiosPagamento,
	tecladoVirtualPagamentoAtivo,
} from "./pagamento";

describe("meioNativoDaFormaNfe", () => {
	it("mapeia códigos da NF-e para os meios nativos do PDV", () => {
		assert.equal(meioNativoDaFormaNfe("01"), "DINHEIRO");
		assert.equal(meioNativoDaFormaNfe("17"), "PIX");
		assert.equal(meioNativoDaFormaNfe("03"), "CARTAO");
		assert.equal(meioNativoDaFormaNfe("04"), "CARTAO");
		assert.equal(meioNativoDaFormaNfe("15"), null);
		assert.equal(meioNativoDaFormaNfe(null), null);
	});
});

describe("meioDaFormaNfe", () => {
	it("usa OUTROS para cheque, boleto e crediário", () => {
		assert.equal(meioDaFormaNfe("02"), "OUTROS");
		assert.equal(meioDaFormaNfe("15"), "OUTROS");
		assert.equal(meioDaFormaNfe("99"), "OUTROS");
	});
});

describe("montarBotoesMeiosPagamento", () => {
	it("lista a prazo e formas não nativas", () => {
		const botoes = montarBotoesMeiosPagamento([
			{
				id: "dinheiro",
				descricao: "Dinheiro",
				formapagamentonfe: "01",
				aprazo: 0,
			},
			{
				id: "boleto",
				descricao: "Boleto",
				formapagamentonfe: "15",
				aprazo: 1,
			},
		]);
		assert.equal(botoes.length, 2);
		assert.equal(botoes[1]?.meio, "OUTROS");
		assert.equal(botoes[1]?.aprazo, 1);
		assert.equal(botoes[1]?.label, "Boleto");
	});

	it("não marca dinheiro/PIX/cartão como a prazo", () => {
		const botoes = montarBotoesMeiosPagamento([
			{
				id: "pix",
				descricao: "PIX",
				formapagamentonfe: "17",
				aprazo: 1,
			},
			{
				id: "dinheiro",
				descricao: "Dinheiro",
				formapagamentonfe: "01",
				aprazo: 1,
			},
		]);
		assert.equal(botoes[0]?.aprazo, 0);
		assert.equal(botoes[1]?.aprazo, 0);
		assert.equal(
			ehPagamentoAPrazo({
				aprazo: 1,
				meio: "PIX",
				formapagamentonfe: "17",
			}),
			false,
		);
	});
});

describe("tecladoVirtualPagamentoAtivo", () => {
	it("fica ligado por padrão e desliga com 0", () => {
		assert.equal(tecladoVirtualPagamentoAtivo(undefined), true);
		assert.equal(tecladoVirtualPagamentoAtivo("1"), true);
		assert.equal(tecladoVirtualPagamentoAtivo("0"), false);
	});
});

describe("calcularAcrescimoInformado", () => {
	it("aplica valor em reais", () => {
		assert.equal(calcularAcrescimoInformado(100, 10, false), 10);
		assert.equal(calcularAcrescimoInformado(0, 5, false), 5);
		assert.equal(calcularAcrescimoInformado(100, 0, false), 0);
	});

	it("aplica percentual sobre a base", () => {
		assert.equal(calcularAcrescimoInformado(80, 10, true), 8);
		assert.equal(calcularAcrescimoInformado(0, 10, true), 0);
	});
});

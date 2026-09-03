import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	filtrarItensAbertosConta,
	itemContaEstaPago,
	mensagemErroCancelarItem,
	partirPorItens,
	partirPorPessoas,
	partirPorValor,
	recalcularTotaisConta,
	valorRestante,
} from "./conta-gourmet";
import {
	hashSenhaGerencial,
	senhaGerencialConfere,
} from "./senha-gerencial";

describe("recalcularTotaisConta", () => {
	it("aplica 10% + couvert 2 pessoas + desconto", () => {
		const totais = recalcularTotaisConta(
			[
				{ precototal: 40 },
				{ precototal: 60 },
			],
			{
				numeropessoas: 2,
				taxaAtiva: true,
				percentualTaxa: 10,
				couvertUnitario: 5,
				desconto: 8,
			},
		);
		assert.equal(totais.subtotal, 100);
		assert.equal(totais.valordesconto, 8);
		assert.equal(totais.valoracrescimo, 0);
		assert.equal(totais.valortaxaservico, 10);
		assert.equal(totais.valorcouvert, 10);
		assert.equal(totais.valorentrega, 0);
		assert.equal(totais.valortotal, 112);
	});

	it("soma acréscimo operacional ao total após desconto e taxas", () => {
		const totais = recalcularTotaisConta([{ precototal: 100 }], {
			numeropessoas: 1,
			taxaAtiva: false,
			percentualTaxa: 0,
			couvertUnitario: 0,
			desconto: 10,
			acrescimo: 7,
		});
		assert.equal(totais.valordesconto, 10);
		assert.equal(totais.valoracrescimo, 7);
		assert.equal(totais.valortotal, 97);
	});

	it("inclui taxa de entrega no total", () => {
		const totais = recalcularTotaisConta([{ precototal: 40 }], {
			numeropessoas: 1,
			taxaAtiva: false,
			percentualTaxa: 10,
			couvertUnitario: 0,
			desconto: 5,
			valorentrega: 8,
		});
		assert.equal(totais.valorentrega, 8);
		assert.equal(totais.valortotal, 43);
	});

	it("sem taxa e sem couvert o total é subtotal menos desconto", () => {
		const totais = recalcularTotaisConta([{ precototal: 50 }], {
			numeropessoas: 1,
			taxaAtiva: false,
			percentualTaxa: 10,
			couvertUnitario: 8,
			desconto: 5,
		});
		assert.equal(totais.valortaxaservico, 0);
		assert.equal(totais.valorcouvert, 8);
		assert.equal(totais.valortotal, 53);
	});
});

describe("partirPorPessoas", () => {
	it("divide R$ 100 em 3 com ajuste de centavos", () => {
		assert.deepEqual(partirPorPessoas(100, 3), [33.33, 33.33, 33.34]);
	});
});

describe("partirPorValor", () => {
	it("aceita partes que somam o total", () => {
		assert.deepEqual(partirPorValor(100, [40, 60]), [40, 60]);
	});

	it("recusa soma diferente do total", () => {
		assert.throws(() => partirPorValor(100, [40, 50]), /soma das partes/);
	});
});

describe("partirPorItens", () => {
	it("preserva a soma do total da conta", () => {
		const itens = [
			{ id: "a", precototal: 40 },
			{ id: "b", precototal: 60 },
		];
		const totais = recalcularTotaisConta(itens, {
			numeropessoas: 1,
			taxaAtiva: true,
			percentualTaxa: 10,
			couvertUnitario: 0,
			desconto: 11,
		});
		const fatias = partirPorItens(itens, [["a"], ["b"]], totais);
		const soma = fatias.reduce((acc, f) => acc + f.total, 0);
		assert.equal(Math.round(soma * 100) / 100, totais.valortotal);
		assert.equal(fatias[0]?.ids[0], "a");
		assert.equal(fatias[1]?.ids[0], "b");
	});
});

describe("valorRestante", () => {
	it("não fica negativo", () => {
		assert.equal(valorRestante(100, 130), 0);
		assert.equal(valorRestante(100, 40), 60);
	});
});

describe("senha gerencial", () => {
	it("confere a senha certa e recusa a errada", () => {
		const { salt, hash } = hashSenhaGerencial("1234");
		assert.equal(senhaGerencialConfere("1234", salt, hash), true);
		assert.equal(senhaGerencialConfere("0000", salt, hash), false);
	});
});

describe("mensagemErroCancelarItem", () => {
	it("permite cancelar item aberto e não pago", () => {
		assert.equal(
			mensagemErroCancelarItem({
				contaValida: true,
				itemEncontrado: true,
				itemPago: false,
				valorPago: 0,
				totalAposCancelar: 40,
			}),
			null,
		);
	});

	it("recusa item já pago", () => {
		assert.equal(
			mensagemErroCancelarItem({
				contaValida: true,
				itemEncontrado: true,
				itemPago: true,
			}),
			"Item já pago não pode ser cancelado",
		);
	});

	it("recusa se o pago ficar maior que o total", () => {
		assert.equal(
			mensagemErroCancelarItem({
				contaValida: true,
				itemEncontrado: true,
				itemPago: false,
				valorPago: 50,
				totalAposCancelar: 40,
			}),
			"Não é possível cancelar: o valor já pago ficaria maior que o total da conta.",
		);
	});

	it("permite esvaziar a conta quando não há pagamento", () => {
		assert.equal(
			mensagemErroCancelarItem({
				contaValida: true,
				itemEncontrado: true,
				itemPago: false,
				valorPago: 0,
				totalAposCancelar: 0,
			}),
			null,
		);
	});
});

describe("itens pagos na comanda", () => {
	it("filtra itens pagos da lista aberta", () => {
		const itens = [
			{ id: "a", pago: 0 },
			{ id: "b", pago: 1 },
			{ id: "c", pago: 0 },
		];
		assert.equal(itemContaEstaPago(itens[1]!), true);
		assert.equal(itemContaEstaPago(itens[0]!), false);
		assert.deepEqual(
			filtrarItensAbertosConta(itens).map((i) => i.id),
			["a", "c"],
		);
	});
});

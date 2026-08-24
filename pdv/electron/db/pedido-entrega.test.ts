import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	gerarSenhaChamada,
	origemVendaPorModalidade,
	parseBairrosEntrega,
	podeFecharDelivery,
	proximoStatusEntrega,
	recalcularTotaisEntrega,
	resolverTaxaEntrega,
} from "./pedido-entrega";

describe("podeFecharDelivery", () => {
	it("recusa delivery sem endereço", () => {
		const r = podeFecharDelivery({ modalidade: "delivery", endereco: "  " });
		assert.equal(r.ok, false);
	});

	it("aceita retirada sem endereço", () => {
		const r = podeFecharDelivery({ modalidade: "retirada", endereco: null });
		assert.equal(r.ok, true);
	});
});

describe("resolverTaxaEntrega", () => {
	it("usa taxa do bairro quando cadastrado", () => {
		const taxa = resolverTaxaEntrega({
			bairro: "Centro",
			padrao: 5,
			tabelaBairros: [{ bairro: "Centro", taxa: 8 }],
		});
		assert.equal(taxa, 8);
	});

	it("cai no padrão quando bairro não está na tabela", () => {
		const taxa = resolverTaxaEntrega({
			bairro: "Outro",
			padrao: 5,
			tabelaBairros: [{ bairro: "Centro", taxa: 8 }],
		});
		assert.equal(taxa, 5);
	});
});

describe("gerarSenhaChamada", () => {
	it("gera senha com 3 dígitos", () => {
		assert.equal(gerarSenhaChamada(1), "001");
		assert.equal(gerarSenhaChamada(42), "042");
		assert.equal(gerarSenhaChamada(1234), "1234");
	});
});

describe("proximoStatusEntrega", () => {
	it("delivery não pula saiu", () => {
		assert.equal(proximoStatusEntrega("recebido", "delivery"), "producao");
		assert.equal(proximoStatusEntrega("producao", "delivery"), "saiu");
		assert.equal(proximoStatusEntrega("saiu", "delivery"), "entregue");
		assert.equal(proximoStatusEntrega("entregue", "delivery"), null);
	});

	it("retirada não tem saiu", () => {
		assert.equal(proximoStatusEntrega("recebido", "retirada"), "producao");
		assert.equal(proximoStatusEntrega("producao", "retirada"), "entregue");
		assert.equal(proximoStatusEntrega("saiu", "retirada"), null);
	});
});

describe("recalcularTotaisEntrega", () => {
	it("soma entrega após desconto", () => {
		const totais = recalcularTotaisEntrega([{ precototal: 40 }], {
			desconto: 5,
			valorentrega: 8,
		});
		assert.equal(totais.subtotal, 40);
		assert.equal(totais.valordesconto, 5);
		assert.equal(totais.valorentrega, 8);
		assert.equal(totais.valortaxaservico, 0);
		assert.equal(totais.valorcouvert, 0);
		assert.equal(totais.valortotal, 43);
	});

	it("bairro Centro R$ 8 + subtotal 40 → total 48", () => {
		const taxa = resolverTaxaEntrega({
			bairro: "Centro",
			padrao: 0,
			tabelaBairros: parseBairrosEntrega(
				JSON.stringify([{ bairro: "Centro", taxa: "8.00" }]),
			),
		});
		const totais = recalcularTotaisEntrega([{ precototal: 40 }], {
			valorentrega: taxa,
		});
		assert.equal(totais.valortotal, 48);
	});
});

describe("origemVendaPorModalidade", () => {
	it("mapeia delivery e retirada", () => {
		assert.equal(origemVendaPorModalidade("delivery"), "delivery");
		assert.equal(origemVendaPorModalidade("retirada"), "retirada");
		assert.equal(origemVendaPorModalidade("mesa"), "mesa");
	});
});

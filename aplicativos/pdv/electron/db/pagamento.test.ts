import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	lancamentosDeBody,
	lancamentoUnico,
	meioPrincipal,
	normalizarLancamentos,
	pagamentosErpDosLancamentos,
	somarLancamentos,
	totaisParaSync,
	totaisPorMeio,
	validarFechamentoPagamentos,
} from "./pagamento";

describe("somarLancamentos", () => {
	it("soma só lançamentos ok", () => {
		assert.equal(
			somarLancamentos([
				{ meio: "PIX", valor: 40, status: "ok" },
				{ meio: "DINHEIRO", valor: 70, status: "ok" },
				{ meio: "CARTAO", valor: 30, status: "cancelado" },
			]),
			110,
		);
	});
});

describe("validarFechamentoPagamentos", () => {
	it("fecha PIX + dinheiro com troco", () => {
		const result = validarFechamentoPagamentos({
			total: 100,
			lancamentos: [
				{ meio: "PIX", valor: 40 },
				{ meio: "DINHEIRO", valor: 70 },
			],
		});
		assert.equal(result.troco, 10);
		assert.equal(result.meio, "MISTO");
		assert.equal(result.totais.pix, 40);
		assert.equal(result.totais.dinheiro, 70);
	});

	it("fecha dois cartões sem troco", () => {
		const result = validarFechamentoPagamentos({
			total: 100,
			lancamentos: [
				{
					meio: "CARTAO",
					valor: 60,
					nsu: "111",
					autorizacao: "A1",
					bandeira: "VISA",
				},
				{
					meio: "CARTAO",
					valor: 40,
					nsu: "222",
					autorizacao: "A2",
					bandeira: "MASTER",
				},
			],
		});
		assert.equal(result.troco, 0);
		assert.equal(result.meio, "CARTAO");
		assert.equal(result.totais.cartao, 100);
		assert.equal(result.efetivos[0]?.nsu, "111");
		assert.equal(result.efetivos[1]?.nsu, "222");
	});

	it("rejeita soma menor que o total", () => {
		assert.throws(
			() =>
				validarFechamentoPagamentos({
					total: 100,
					lancamentos: [{ meio: "PIX", valor: 40 }],
				}),
			/insuficiente/i,
		);
	});

	it("rejeita troco sem dinheiro", () => {
		assert.throws(
			() =>
				validarFechamentoPagamentos({
					total: 100,
					lancamentos: [
						{ meio: "PIX", valor: 40 },
						{ meio: "CARTAO", valor: 70 },
					],
				}),
			/troco só é permitido em dinheiro/i,
		);
	});

	it("rejeita pagamento pendente", () => {
		assert.throws(
			() =>
				validarFechamentoPagamentos({
					total: 100,
					lancamentos: [{ meio: "CARTAO", valor: 100, status: "pendente" }],
				}),
			/pendente/i,
		);
	});

	it("aceita troco legado quando a soma fecha o total", () => {
		const result = validarFechamentoPagamentos({
			total: 100,
			lancamentos: [lancamentoUnico("DINHEIRO", 100)],
			troco: 20,
		});
		assert.equal(result.troco, 20);
		assert.equal(result.totais.dinheiro, 100);
	});
});

describe("normalizarLancamentos / lancamentosDeBody", () => {
	it("normaliza array de pagamentos", () => {
		const lista = normalizarLancamentos([
			{ meio: "pix", valor: "40.5", nsu: " 9 " },
			{ meio: "CHEQUE", valor: 10 },
			{ meio: "CARTAO", valor: 0 },
		]);
		assert.equal(lista.length, 1);
		assert.equal(lista[0]?.meio, "PIX");
		assert.equal(lista[0]?.valor, 40.5);
		assert.equal(lista[0]?.nsu, "9");
	});

	it("aceita pagamentos no body ou meio legado", () => {
		assert.equal(
			lancamentosDeBody({
				pagamentos: [{ meio: "PIX", valor: 30 }],
			}).length,
			1,
		);
		assert.deepEqual(
			lancamentosDeBody({ meio: "CARTAO" }, { meio: "CARTAO", valor: 50 }),
			[{ meio: "CARTAO", valor: 50, status: "ok" }],
		);
	});
});

describe("totaisPorMeio / meioPrincipal", () => {
	it("agrega por meio", () => {
		const totais = totaisPorMeio([
			{ meio: "PIX", valor: 10 },
			{ meio: "PIX", valor: 15 },
			{ meio: "CARTAO", valor: 20 },
		]);
		assert.equal(totais.pix, 25);
		assert.equal(totais.cartao, 20);
		assert.equal(meioPrincipal([{ meio: "PIX", valor: 10 }]), "PIX");
		assert.equal(
			meioPrincipal([
				{ meio: "PIX", valor: 10 },
				{ meio: "DINHEIRO", valor: 10 },
			]),
			"MISTO",
		);
	});

	it("não mistura cheque/boleto com cartão", () => {
		const totais = totaisPorMeio([
			{ meio: "CARTAO", valor: 40, formapagamentonfe: "03" },
			{
				meio: "OUTROS",
				valor: 60,
				formapagamentonfe: "15",
				idtipodocumentofinanceiro: "11111111-1111-4111-8111-111111111111",
			},
		]);
		assert.equal(totais.cartao, 40);
		assert.equal(totais.outros, 60);
		const sync = totaisParaSync(
			[
				{ meio: "CARTAO", valor: 40, formapagamentonfe: "04" },
				{
					meio: "OUTROS",
					valor: 60,
					idtipodocumentofinanceiro: "11111111-1111-4111-8111-111111111111",
				},
			],
			0,
		);
		assert.equal(sync.valorcartaodebito, 40);
		assert.equal(sync.valorcartaocredito, 0);
		assert.equal(sync.valorprepago, 60);
		assert.deepEqual(
			pagamentosErpDosLancamentos([
				{
					meio: "PIX",
					valor: 40,
					aprazo: 1,
					idtipodocumentofinanceiro: "11111111-1111-4111-8111-111111111111",
					formapagamentonfe: "17",
				},
				{
					meio: "OUTROS",
					valor: 60,
					aprazo: 1,
					formapagamentonfe: "15",
					idtipodocumentofinanceiro: "11111111-1111-4111-8111-111111111111",
				},
			]),
			[
				{
					idtipodocumentofinanceiro: "11111111-1111-4111-8111-111111111111",
					valor: 60,
				},
			],
		);
	});
});

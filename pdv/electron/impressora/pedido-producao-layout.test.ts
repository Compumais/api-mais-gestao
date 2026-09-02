import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	linhasComPrefixo,
	montarLinhasPedidoProducao,
	quebrarTextoCupom,
} from "./pedido-producao-layout";

describe("layout pedido de produção", () => {
	it("quebra por palavras respeitando a largura", () => {
		assert.deepEqual(quebrarTextoCupom("X-BURGER BACON ESPECIAL DA CASA", 16), [
			"X-BURGER BACON",
			"ESPECIAL DA CASA",
		]);
	});

	it("quebra por caracteres quando a palavra excede a largura", () => {
		assert.deepEqual(quebrarTextoCupom("SUPERCALIFRAGILISTICO", 8), [
			"SUPERCAL",
			"IFRAGILI",
			"STICO",
		]);
	});

	it("alinha continuação sob a descrição após o prefixo de quantidade", () => {
		const linhas = linhasComPrefixo(
			"2  ",
			"Hamburguer artesanal com cheddar e bacon crocante",
			32,
		);
		assert.deepEqual(linhas, [
			"2  Hamburguer artesanal com",
			"   cheddar e bacon crocante",
		]);
		assert.ok(linhas.every((l) => l.length <= 32));
	});

	it("não corta descrição longa no cupom de produção", () => {
		const descricao =
			"X-TUDO ESPECIAL COM BACON CHEDDAR OVO E SALADA COMPLETA";
		const linhas = montarLinhasPedidoProducao({
			origem: "Mesa 1",
			itens: [
				{
					quantidade: 1,
					descricao,
					observacao: "SEM CEBOLA E COM MOLHO ESPECIAL DA CASA",
				},
			],
			tamanhoFonte: "media",
			agora: new Date("2026-09-02T12:00:00.000Z"),
		});
		const texto = linhas.join("\n");
		assert.ok(texto.includes("SALADA"));
		assert.ok(texto.includes("COMPLETA"));
		assert.ok(texto.includes("MOLHO"));
		assert.ok(texto.includes("ESPECIAL"));
		assert.ok(texto.includes("   Obs:"));
		const linhasItem = linhas.filter(
			(l) =>
				l.startsWith("1  ") ||
				(/^ {3}/.test(l) && !l.startsWith("---") && l.trim().length > 0),
		);
		assert.ok(linhasItem.length >= 3);
		assert.ok(linhasItem.every((l) => l.length <= 32));
	});

	it("mantém cabeçalho de grupo e quantidade", () => {
		const linhas = montarLinhasPedidoProducao({
			origem: "Mesa 2",
			agruparPorGrupo: true,
			itens: [
				{
					quantidade: 3,
					descricao: "Suco",
					nomeGrupo: "Bebidas",
				},
			],
			tamanhoFonte: "media",
			agora: new Date("2026-09-02T12:00:00.000Z"),
		});
		assert.ok(linhas.some((l) => l === ">> BEBIDAS"));
		assert.ok(linhas.some((l) => l === "3  Suco"));
	});
});

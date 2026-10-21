import { describe, expect, it } from "vitest";
import type { NovoProduto, Produto } from "@/model/produto-model.js";
import {
	aplicarHerancaVariacao,
	extrairTributacaoProduto,
	payloadAlteraTributacao,
	tributacaoParaPropagar,
} from "./aplicar-heranca-variacao.js";

function produtoPai(parcial: Partial<Produto> = {}): Produto {
	return {
		id: "pai",
		idempresa: "empresa-1",
		nome: "Pizza",
		descricao: "Pizza",
		ncm: "19059090",
		origem: 0,
		situacaotributaria: "00",
		referencia: "PZ",
		ean: "7891000000001",
		quantidadepadrao: 12,
		custoaquisicao: "8.50",
		idgrupogourmet: "gourmet-1",
		idprodutopai: null,
		...parcial,
	} as Produto;
}

describe("aplicarHerancaVariacao", () => {
	it("grava a tributação do pai e ignora impostos enviados no body", () => {
		const pai = produtoPai();
		const dados = {
			nome: "Pizza M",
			ncm: "99999999",
			origem: 2,
			situacaotributaria: "60",
			referencia: "M",
		} as Partial<NovoProduto>;

		const resultado = aplicarHerancaVariacao(dados, pai, "criar");

		expect(resultado.ncm).toBe("19059090");
		expect(resultado.origem).toBe(0);
		expect(resultado.situacaotributaria).toBe("00");
		expect(resultado.nome).toBe("Pizza M");
		expect(resultado.referencia).toBe("M");
	});

	it("herda referência vazia, não herda código de barras e não copia estoque", () => {
		const pai = produtoPai();
		const dados = {
			nome: "Pizza G",
			referencia: null,
			ean: null,
			quantidadepadrao: 0,
			custoaquisicao: null,
		} as Partial<NovoProduto>;

		const resultado = aplicarHerancaVariacao(dados, pai, "criar");

		expect(resultado.referencia).toBe("PZ");
		expect(resultado.ean).toBeNull();
		expect(resultado.quantidadepadrao).toBe(0);
		expect(resultado.custoaquisicao).toBe("8.50");
	});

	it("na atualização parcial não preenche campo omitido e ainda substitui a tributação", () => {
		const pai = produtoPai({ idgrupogourmet: "gourmet-pai" });
		const dados = {
			nome: "Pizza P",
		} as Partial<NovoProduto>;

		const resultado = aplicarHerancaVariacao(dados, pai, "atualizar");

		expect(resultado).not.toHaveProperty("referencia");
		expect(resultado).not.toHaveProperty("custoaquisicao");
		expect(resultado.ncm).toBe("19059090");
		expect(resultado.idgrupogourmet).toBeUndefined();
	});

	it("propaga o snapshot fiscal do pai quando o payload altera tributação", () => {
		const pai = produtoPai({ ncm: "19059090", aliquotaicmsinterna: "18.00" });
		const dados = { ncm: "19051100" } as Partial<NovoProduto>;

		expect(payloadAlteraTributacao(dados)).toBe(true);
		expect(payloadAlteraTributacao({ nome: "Pizza" })).toBe(false);
		expect(tributacaoParaPropagar(pai, dados)).toMatchObject({
			ncm: "19051100",
			origem: 0,
			situacaotributaria: "00",
			aliquotaicmsinterna: "18.00",
		});
		expect(extrairTributacaoProduto(pai).ncm).toBe("19059090");
	});
});

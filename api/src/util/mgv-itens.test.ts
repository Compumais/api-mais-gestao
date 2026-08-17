import { describe, expect, it } from "vitest";
import {
	eanFornecedor12,
	montarArquivoItensMgv,
	montarLinhaItensMgv,
	normalizarDepartamentoMgv,
	precoCentavosMgv,
	produtoEhPesoMgv,
	produtoExportaBalancaMgv,
	resolverDiasValidadeMgv,
} from "./mgv-itens";

describe("montarLinhaItensMgv", () => {
	it("monta linha de peso com código, preço em centavos e descrição", () => {
		const linha = montarLinhaItensMgv({
			codigo: 123,
			descricao: "Picanha kg",
			preco: 54.9,
			pesavel: true,
			departamento: 1,
			ean: "7891234567890",
		});
		expect(linha.startsWith("010000123005490000PICANHA KG")).toBe(true);
		expect(linha.slice(2, 3)).toBe("0");
		expect(linha).toHaveLength(246);
		expect(linha).toContain("789123456789");
		expect(linha).not.toMatch(/\n/);
	});

	it("marca unidade quando não é pesável", () => {
		const linha = montarLinhaItensMgv({
			codigo: 10,
			descricao: "Refrigerante",
			preco: 8,
			pesavel: false,
		});
		expect(linha.slice(2, 3)).toBe("1");
	});

	it("liga impressão de datas quando há validade", () => {
		const linha = montarLinhaItensMgv({
			codigo: 1,
			descricao: "A",
			preco: 1,
			pesavel: true,
			diasValidade: 7,
		});
		expect(linha.slice(15, 18)).toBe("007");
		expect(linha.slice(84, 86)).toBe("11");
	});
});

describe("helpers", () => {
	it("reconhece kg e pesável", () => {
		expect(produtoEhPesoMgv({ pesavel: 1 })).toBe(true);
		expect(produtoEhPesoMgv({ unidademedida: "KG" })).toBe(true);
		expect(produtoEhPesoMgv({ unidademedida: "UN" })).toBe(false);
	});

	it("normaliza departamento 1–99", () => {
		expect(normalizarDepartamentoMgv("05")).toBe(5);
		expect(normalizarDepartamentoMgv(0)).toBe(1);
		expect(normalizarDepartamentoMgv(100)).toBe(1);
	});

	it("converte preço e EAN", () => {
		expect(precoCentavosMgv(2.78)).toBe(278);
		expect(precoCentavosMgv(0)).toBeNull();
		expect(eanFornecedor12("7891234567890")).toBe("789123456789");
	});

	it("resolve validade do produto ou o padrão da exportação", () => {
		expect(resolverDiasValidadeMgv(7, 0)).toBe(7);
		expect(resolverDiasValidadeMgv(0, 5)).toBe(5);
		expect(resolverDiasValidadeMgv(null, 3)).toBe(3);
		expect(resolverDiasValidadeMgv(998, 0)).toBe(998);
		expect(produtoExportaBalancaMgv(1)).toBe(true);
		expect(produtoExportaBalancaMgv(0)).toBe(false);
	});
});

describe("montarArquivoItensMgv", () => {
	it("termina cada item com CRLF", () => {
		const arquivo = montarArquivoItensMgv([
			{ codigo: 1, descricao: "A", preco: 1, pesavel: true },
		]);
		expect(arquivo.endsWith("\r\n")).toBe(true);
		expect(arquivo.split("\r\n").filter(Boolean)).toHaveLength(1);
	});
});

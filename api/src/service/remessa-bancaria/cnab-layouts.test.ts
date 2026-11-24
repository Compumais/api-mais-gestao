import { describe, expect, it } from "vitest";
import { montarArquivoCnab240 } from "@/service/remessa-bancaria/gerar-cnab240.js";
import { montarArquivoCnab400 } from "@/service/remessa-bancaria/gerar-cnab400.js";
import { montarArquivoRemessa } from "@/service/remessa-bancaria/montar-arquivo-remessa.js";
import { parseArquivoRetorno } from "@/service/retorno-bancario/parse-arquivo-retorno.js";
import { parseArquivoCnab240 } from "@/service/retorno-bancario/parse-cnab240.js";
import { parseArquivoCnab400 } from "@/service/retorno-bancario/parse-cnab400.js";
import {
	LAYOUT_CNAB,
	normalizarLayoutCnab,
	resolverLayoutRemessa,
	resolverLayoutRetorno,
} from "@/util/cnab-layouts.js";

const empresaFake = {
	id: "emp-1",
	nome: "Empresa Teste LTDA",
	cnpj: "12345678000199",
} as never;

const contaFake = {
	id: "cc-1",
	idempresa: "emp-1",
	idbanco: "001",
	agencia: "1234",
	agenciadv: "5",
	numeroconta: "123456",
	contadv: "7",
	carteira: "17",
	codigocedente: "1234567",
	layoutarquivoremessa: "cnab240",
	layoutarquivoretorno: null,
} as never;

const tituloFake = {
	titulo: {
		id: "fin-1",
		documento: "NF100",
		valor: "150.50",
		vencimento: "2026-12-10",
		emissao: "2026-11-10",
		nossonumero: "00000000001",
		dvnossonumero: "3",
	},
	item: {
		id: "item-1",
		idremessa: "rem-1",
		idfinanceiro: "fin-1",
		nossonumero: "00000000001",
	},
	sacadoNome: "Cliente Teste",
	sacadoDocumento: "12345678901",
} as never;

function linhaFixa(tamanho: number, campos: Array<[number, string]>): string {
	const chars = Array.from({ length: tamanho }, () => " ");
	for (const [pos, valor] of campos) {
		for (let i = 0; i < valor.length && pos + i < tamanho; i++) {
			chars[pos + i] = valor[i]!;
		}
	}
	return chars.join("");
}

describe("cnab layouts util", () => {
	it("normaliza layouts 240 e 400", () => {
		expect(normalizarLayoutCnab("CNAB 240")).toBe(LAYOUT_CNAB.CNAB240);
		expect(normalizarLayoutCnab("400")).toBe(LAYOUT_CNAB.CNAB400);
		expect(resolverLayoutRemessa({ layoutarquivoremessa: "cnab400" })).toBe(
			LAYOUT_CNAB.CNAB400,
		);
		expect(
			resolverLayoutRetorno({
				layoutarquivoretorno: null,
				layoutarquivoremessa: "cnab400",
			}),
		).toBe(LAYOUT_CNAB.CNAB400);
	});
});

describe("geradores CNAB", () => {
	it("gera arquivo CNAB 240 com linhas de 240 posições", () => {
		const conteudo = montarArquivoCnab240({
			empresa: empresaFake,
			conta: contaFake,
			sequencia: 1,
			titulos: [tituloFake],
			codigoBanco: "001",
		});
		// Não usar trim(): espaços finais da última linha fazem parte do CNAB.
		const linhas = conteudo.replace(/\r?\n$/, "").split(/\r?\n/);
		expect(linhas.length).toBeGreaterThan(3);
		for (const linha of linhas) {
			expect(linha.length).toBe(240);
		}
		expect(linhas[0]?.startsWith("001")).toBe(true);
		expect(linhas.some((l) => l.includes("NF100"))).toBe(true);
		expect(linhas.some((l) => l.includes("CLIENTE TESTE"))).toBe(true);
	});

	it("gera arquivo CNAB 400 com header tipo 0", () => {
		const conteudo = montarArquivoCnab400({
			empresa: empresaFake,
			conta: contaFake,
			sequencia: 2,
			titulos: [tituloFake],
			codigoBanco: "001",
		});
		const linhas = conteudo.replace(/\r?\n$/, "").split(/\r?\n/);
		expect(linhas[0]?.startsWith("0")).toBe(true);
		expect(linhas.some((l) => l.startsWith("1"))).toBe(true);
		expect(linhas.at(-1)?.startsWith("9")).toBe(true);
		for (const linha of linhas) {
			expect(linha.length).toBe(400);
		}
	});

	it("registry escolhe layout da conta", () => {
		const arquivo = montarArquivoRemessa({
			empresa: empresaFake,
			conta: { ...contaFake, layoutarquivoremessa: "cnab400" } as never,
			sequencia: 3,
			titulos: [tituloFake],
			codigoBanco: "001",
		});
		expect(arquivo.layout).toBe(LAYOUT_CNAB.CNAB400);
		expect(arquivo.conteudo.startsWith("0")).toBe(true);
	});
});

describe("parsers CNAB retorno", () => {
	it("parseia segmento T/U do CNAB 240", () => {
		const t = linhaFixa(240, [
			[0, "001"],
			[3, "0001"],
			[7, "3"],
			[8, "00001"],
			[13, "T"],
			[15, "06"],
			[37, "00000000001"],
			[58, "NF100"],
			[73, "20261210"],
			[81, "000000000015050"],
			[148, "Cliente Teste"],
		]);
		const u = linhaFixa(240, [
			[0, "001"],
			[3, "0001"],
			[7, "3"],
			[8, "00001"],
			[13, "U"],
			[15, "06"],
			[77, "000000000015050"],
			[137, "20261116"],
			[145, "20261117"],
		]);

		const parseado = parseArquivoCnab240(`${t}\r\n${u}\r\n`);
		expect(parseado.itens).toHaveLength(1);
		expect(parseado.itens[0]?.ocorrencia).toBe("06");
		expect(parseado.itens[0]?.nossonumero).toContain("1");
		expect(parseado.itens[0]?.valorpago).toBe("150.50");
	});

	it("parseia detalhe tipo 1 do CNAB 400", () => {
		const detalhe = linhaFixa(400, [
			[0, "1"],
			[70, "000000000013"],
			[108, "06"],
			[110, "161126"],
			[116, "NF100"],
			[146, "101226"],
			[152, "0000000015050"],
			[253, "0000000015050"],
		]);

		const parseado = parseArquivoCnab400(`${detalhe}\r\n`);
		expect(parseado.itens).toHaveLength(1);
		expect(parseado.itens[0]?.ocorrencia).toBe("06");
		expect(parseado.itens[0]?.numerodocumento).toBe("NF100");
	});

	it("parseArquivoRetorno faz fallback entre layouts", () => {
		const detalhe = linhaFixa(400, [
			[0, "1"],
			[70, "000000000099"],
			[108, "06"],
			[152, "0000000001000"],
			[253, "0000000001000"],
		]);
		const parseado = parseArquivoRetorno(detalhe, "cnab240");
		expect(parseado.itens.length).toBeGreaterThanOrEqual(1);
	});
});

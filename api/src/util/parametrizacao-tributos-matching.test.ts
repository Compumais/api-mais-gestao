import { describe, expect, it } from "vitest";
import {
	campoTributacaoAusenteOuInvalido,
	cstsEntradaCoincidem,
	extrairCstOuCsosn,
	normalizarCodigoCfop,
	normalizarCsosnSaida,
	normalizarCstSaida,
	regraParametrizacaoCasaComNota,
} from "./parametrizacao-tributos-matching.js";
import { aplicarParametrizacaoTributosImportacao } from "./resolver-parametrizacao-tributos-importacao.js";
import type { ParametrizacaoTributos } from "@/repositories/parametrizacao-tributos-repositories.js";
import { mesclarSugestaoTributacaoSaidaProduto } from "./sugerir-tributacao-saida-produto-nf.js";

describe("normalizarCodigoCfop", () => {
	it("mantém apenas dígitos", () => {
		expect(normalizarCodigoCfop("5.102")).toBe("5102");
		expect(normalizarCodigoCfop("5102")).toBe("5102");
	});
});

describe("extrairCstOuCsosn", () => {
	it("identifica CSOSN de 3 dígitos", () => {
		expect(extrairCstOuCsosn("102")).toEqual({
			cst: undefined,
			csosn: "102",
		});
	});

	it("identifica CST com origem", () => {
		expect(extrairCstOuCsosn("000")).toEqual({
			cst: "000",
			csosn: undefined,
		});
	});
});

describe("matching CST na parametrização de tributos", () => {
	it("compara CST com origem no XML pelos últimos 2 dígitos quando comprimentos diferem", () => {
		expect(cstsEntradaCoincidem("000", "00", 0)).toBe(true);
		expect(cstsEntradaCoincidem("010", "10", 0)).toBe(true);
	});

	it("compara CST com origem quando a regra ignora o primeiro dígito", () => {
		expect(cstsEntradaCoincidem("000", "00", 1)).toBe(true);
		expect(cstsEntradaCoincidem("010", "10", 1)).toBe(true);
	});

	it("exige CST exato quando comprimentos iguais e sem flag", () => {
		expect(cstsEntradaCoincidem("00", "00", 0)).toBe(true);
		expect(cstsEntradaCoincidem("00", "10", 0)).toBe(false);
	});
});

describe("regraParametrizacaoCasaComNota", () => {
	it("casa por CFOP genérico (sem CST/CSOSN na regra) com XML CSOSN", () => {
		expect(
			regraParametrizacaoCasaComNota(
				{ cstentrada: null, csosnentrada: null, ncm: null, uf: null },
				{ csosnentrada: "102" },
			),
		).toBe(true);
	});

	it("casa CST XML 000 com regra 00", () => {
		expect(
			regraParametrizacaoCasaComNota(
				{
					cstentrada: "00",
					csosnentrada: null,
					ncm: null,
					uf: null,
					ignorarprimeirodigitocst: 0,
				},
				{ cstentrada: "000" },
			),
		).toBe(true);
	});

	it("não descarta regra com CST quando XML só tem CSOSN", () => {
		expect(
			regraParametrizacaoCasaComNota(
				{ cstentrada: "00", csosnentrada: null, ncm: null, uf: null },
				{ csosnentrada: "102" },
			),
		).toBe(true);
	});

	it("exige NCM quando a regra tem NCM", () => {
		expect(
			regraParametrizacaoCasaComNota(
				{ cstentrada: null, csosnentrada: null, ncm: "22021000", uf: null },
				{ ncm: "12345678" },
			),
		).toBe(false);
	});
});

describe("normalização de saída CST/CSOSN", () => {
	it("normaliza cstnfe 0 para 00 e CSOSN com 3 dígitos", () => {
		expect(normalizarCstSaida("0")).toBe("00");
		expect(normalizarCstSaida("00")).toBe("00");
		expect(normalizarCsosnSaida("101")).toBe("101");
	});

	it("aplicarParametrizacaoTributosImportacao preenche CST/CSOSN normalizados", () => {
		const regra = {
			id: "r1",
			idempresa: "e1",
			codigocfopentrada: "5102",
			cstentrada: null,
			csosnentrada: null,
			ncm: null,
			taxaicmsentrada: null,
			uf: null,
			ignorarprimeirodigitocst: 0,
			idcfopsaidanfe: "cfop-saida",
			cstnfe: "0",
			csosnnfe: "101",
			taxaicmsnfe: "SSS",
			idcfopsaidanfce: null,
			cstnfce: "0",
			csosnnfce: "102",
			taxaicmsnfce: "SSS",
			cstpis: null,
			aliquotapis: null,
			cstcofins: null,
			aliquotacofins: null,
			cstipi: null,
			percentualmva: null,
			percentualirrf: null,
			idenquadramentoipi: null,
			inativo: 0,
			criadoem: "2026-01-01",
			atualizadoem: "2026-01-01",
		} as ParametrizacaoTributos;

		const resultado = aplicarParametrizacaoTributosImportacao(regra, "5102");

		expect(resultado.sugestao.situacaotributaria).toBe("00");
		expect(resultado.sugestao.situacaotributariasn).toBe("101");
		expect(resultado.sugestao.tributacaoespecial).toBe("00");
		expect(resultado.sugestao.tributacaosn).toBe("102");
	});
});

describe("mesclarSugestaoTributacaoSaidaProduto", () => {
	it("preenche quando produto tem CST inválido '0'", () => {
		const mesclado = mesclarSugestaoTributacaoSaidaProduto(
			{ situacaotributaria: "0", situacaotributariasn: null },
			{ situacaotributaria: "00", situacaotributariasn: "101" },
		);

		expect(mesclado.situacaotributaria).toBe("00");
		expect(mesclado.situacaotributariasn).toBe("101");
	});

	it("não sobrescreve CST válido já cadastrado", () => {
		const mesclado = mesclarSugestaoTributacaoSaidaProduto(
			{ situacaotributaria: "60" },
			{ situacaotributaria: "00" },
		);

		expect(mesclado.situacaotributaria).toBeUndefined();
	});
});

describe("campoTributacaoAusenteOuInvalido", () => {
	it("trata vazio e '0' como inválidos", () => {
		expect(campoTributacaoAusenteOuInvalido(null)).toBe(true);
		expect(campoTributacaoAusenteOuInvalido("0")).toBe(true);
		expect(campoTributacaoAusenteOuInvalido("00")).toBe(false);
	});
});

describe("contrato CFOP do XML", () => {
	it("regra 1102 não casa com critério 5102 (só na camada CFOP)", () => {
		expect(normalizarCodigoCfop("1102")).not.toBe(
			normalizarCodigoCfop("5102"),
		);
	});
});

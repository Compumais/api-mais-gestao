import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CONFIG_ETIQUETA_BALANCA_PADRAO,
	configEtiquetaDeMapa,
	ean13Valido,
	layoutEtiquetaVisual,
	montarEan13Etiqueta,
	montarLancamentoEtiqueta,
	parsearEtiquetaBalanca,
} from "./etiqueta";

const mgv6 = {
	...CONFIG_ETIQUETA_BALANCA_PADRAO,
	habilitada: true,
};

describe("layout MGV6 (4 dígitos, preço total, centavos)", () => {
	it("mostra 2CCCC0TTTTTTDV", () => {
		assert.equal(layoutEtiquetaVisual(mgv6), "2CCCC0TTTTTTDV");
	});

	it("lê PLU e preço total da etiqueta da captura", () => {
		const ean = montarEan13Etiqueta(mgv6, 123, 15.5);
		assert.equal(ean.length, 13);
		assert.equal(ean13Valido(ean), true);
		const parse = parsearEtiquetaBalanca(ean, mgv6);
		assert.ok(parse);
		assert.equal(parse?.codigo, 123);
		assert.equal(parse?.valor, 15.5);
	});

	it("ignora quando a leitura está desligada", () => {
		const ean = montarEan13Etiqueta(mgv6, 10, 8);
		assert.equal(
			parsearEtiquetaBalanca(ean, CONFIG_ETIQUETA_BALANCA_PADRAO),
			null,
		);
	});

	it("rejeita DV inválido", () => {
		const ean = montarEan13Etiqueta(mgv6, 10, 8);
		const ruim = `${ean.slice(0, 12)}0`;
		assert.equal(parsearEtiquetaBalanca(ruim, mgv6), null);
	});
});

describe("peso no código", () => {
	it("interpreta gramas em 6 dígitos", () => {
		const cfg = { ...mgv6, conteudo: "peso" as const };
		assert.equal(layoutEtiquetaVisual(cfg), "2CCCC0PPPPPPDV");
		const ean = montarEan13Etiqueta(cfg, 45, 1.25);
		const parse = parsearEtiquetaBalanca(ean, cfg);
		assert.equal(parse?.codigo, 45);
		assert.equal(parse?.valor, 1.25);
	});
});

describe("5 dígitos de código", () => {
	it("não usa o zero de preenchimento", () => {
		const cfg = { ...mgv6, digitosCodigo: 5 };
		assert.equal(layoutEtiquetaVisual(cfg), "2CCCCCTTTTTTDV");
		const ean = montarEan13Etiqueta(cfg, 12345, 9.9);
		const parse = parsearEtiquetaBalanca(ean, cfg);
		assert.equal(parse?.codigo, 12345);
		assert.equal(parse?.valor, 9.9);
	});
});

describe("montarLancamentoEtiqueta", () => {
	it("deriva kg a partir do preço total", () => {
		const parse = parsearEtiquetaBalanca(
			montarEan13Etiqueta(mgv6, 1, 27.45),
			mgv6,
		);
		assert.ok(parse);
		const lanc = montarLancamentoEtiqueta(
			{ preco: 54.9, unidademedida: "KG" },
			parse,
			mgv6,
		);
		assert.equal(lanc.pesado, true);
		assert.equal(lanc.precototal, 27.45);
		assert.equal(lanc.precounitario, 54.9);
		assert.equal(lanc.quantidade, 0.5);
	});

	it("lança unidade com o preço da etiqueta", () => {
		const parse = parsearEtiquetaBalanca(
			montarEan13Etiqueta(mgv6, 8, 6.5),
			mgv6,
		);
		assert.ok(parse);
		const lanc = montarLancamentoEtiqueta(
			{ preco: 5, unidademedida: "UN" },
			parse,
			mgv6,
		);
		assert.equal(lanc.pesado, false);
		assert.equal(lanc.quantidade, 1);
		assert.equal(lanc.precototal, 6.5);
	});
});

describe("configEtiquetaDeMapa", () => {
	it("usa o padrão da tela MGV6", () => {
		const cfg = configEtiquetaDeMapa({});
		assert.equal(cfg.habilitada, false);
		assert.equal(cfg.prefixo, "2");
		assert.equal(cfg.digitosCodigo, 4);
		assert.equal(cfg.conteudo, "preco");
		assert.equal(cfg.centavos, true);
	});
});

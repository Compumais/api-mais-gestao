import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	aplicarIgnorarDigitoVerificador,
	formatarNumeroComanda,
	gerarXmlComandas,
	normalizarCasasComanda,
	normalizarIgnorarDigitoVerificador,
	normalizarNumerosComanda,
} from "./xml";

describe("gerarXmlComandas", () => {
	it("lista vazia gera raiz auto-fechada", () => {
		assert.equal(
			gerarXmlComandas([]),
			`<?xml version="1.0" encoding="UTF-8"?>\n<Comandas />\n`,
		);
	});

	it("uma comanda", () => {
		assert.equal(
			gerarXmlComandas([101]),
			`<?xml version="1.0" encoding="UTF-8"?>\n<Comandas>\n    <Comanda>101</Comanda>\n</Comandas>\n`,
		);
	});

	it("várias comandas em ordem", () => {
		assert.equal(
			gerarXmlComandas([101, 102, 103]),
			`<?xml version="1.0" encoding="UTF-8"?>\n<Comandas>\n    <Comanda>101</Comanda>\n    <Comanda>102</Comanda>\n    <Comanda>103</Comanda>\n</Comandas>\n`,
		);
	});

	it("remove duplicatas", () => {
		assert.deepEqual(normalizarNumerosComanda([101, 101, 102]), ["101", "102"]);
		assert.equal(
			gerarXmlComandas([101, 101, 102]),
			`<?xml version="1.0" encoding="UTF-8"?>\n<Comandas>\n    <Comanda>101</Comanda>\n    <Comanda>102</Comanda>\n</Comandas>\n`,
		);
	});

	it("completa com zeros à esquerda conforme as casas", () => {
		assert.equal(formatarNumeroComanda(1, 1), "1");
		assert.equal(formatarNumeroComanda(1, 2), "01");
		assert.equal(formatarNumeroComanda(1, 3), "001");
		assert.equal(formatarNumeroComanda(101, 2), "101");
		assert.equal(normalizarCasasComanda("0"), 1);
		assert.equal(normalizarCasasComanda("9"), 6);
		assert.equal(
			gerarXmlComandas([1, 12], { casas: 3 }),
			`<?xml version="1.0" encoding="UTF-8"?>\n<Comandas>\n    <Comanda>001</Comanda>\n    <Comanda>012</Comanda>\n</Comandas>\n`,
		);
	});

	it("ignora dígito verificador antes das casas", () => {
		assert.equal(aplicarIgnorarDigitoVerificador(1015, false), "1015");
		assert.equal(aplicarIgnorarDigitoVerificador(1015, true), "101");
		assert.equal(aplicarIgnorarDigitoVerificador(5, true), "5");
		assert.equal(normalizarIgnorarDigitoVerificador("1"), true);
		assert.equal(normalizarIgnorarDigitoVerificador("0"), false);
		assert.equal(formatarNumeroComanda(1015, 4, true), "0101");
		assert.deepEqual(normalizarNumerosComanda([1015, 1026], 3, true), [
			"101",
			"102",
		]);
		assert.equal(
			gerarXmlComandas([1015, 12], {
				casas: 4,
				ignorarDigitoVerificador: true,
			}),
			`<?xml version="1.0" encoding="UTF-8"?>\n<Comandas>\n    <Comanda>0001</Comanda>\n    <Comanda>0101</Comanda>\n</Comandas>\n`,
		);
	});
});

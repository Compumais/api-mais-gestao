import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gerarXmlComandas, normalizarNumerosComanda } from "./xml";

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
});

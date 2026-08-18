import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statusNfceRetaguardaParaPdv } from "./nfce-retaguarda";

describe("status NFC-e da retaguarda", () => {
	it("mapeia status da nota fiscal para o PDV", () => {
		assert.equal(statusNfceRetaguardaParaPdv(100), "autorizada");
		assert.equal(statusNfceRetaguardaParaPdv(102), "inutilizada");
		assert.equal(statusNfceRetaguardaParaPdv(110), "erro");
		assert.equal(statusNfceRetaguardaParaPdv(101), "cancelada");
		assert.equal(statusNfceRetaguardaParaPdv(90), "pendente");
		assert.equal(statusNfceRetaguardaParaPdv(null), null);
	});

	it("não trata pendente da retaguarda como autorização local", () => {
		assert.notEqual(statusNfceRetaguardaParaPdv(90), "autorizada");
	});
});

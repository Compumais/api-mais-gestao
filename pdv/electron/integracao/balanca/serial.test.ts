import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizarNomePorta } from "./serial";

describe("normalizarNomePorta", () => {
	it("remove prefixo Windows e barra final", () => {
		assert.equal(normalizarNomePorta("com1"), "COM1");
		assert.equal(normalizarNomePorta("\\\\.\\COM1"), "COM1");
		assert.equal(normalizarNomePorta("\\\\.\\COM1\\"), "COM1");
		assert.equal(normalizarNomePorta(" COM12 "), "COM12");
	});
});

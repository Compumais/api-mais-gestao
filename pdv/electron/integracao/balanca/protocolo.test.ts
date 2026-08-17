import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	comandoSolicitarPeso,
	extrairPesoKg,
	normalizarProtocoloBalanca,
} from "./protocolo";

describe("extrairPesoKg", () => {
	it("lê frame Toledo STX + dígitos + ETX (3 casas)", () => {
		const frame = `\x02001250\x03`;
		assert.equal(extrairPesoKg(frame, "toledo"), 1.25);
	});

	it("lê Toledo com texto e ponto", () => {
		assert.equal(extrairPesoKg("\x02I  0.450\x03", "toledo"), 0.45);
	});

	it("lê Filizola em gramas", () => {
		assert.equal(extrairPesoKg("\x02000450\x03", "filizola"), 0.45);
	});

	it("lê contínuo ASCII", () => {
		assert.equal(extrairPesoKg("0,750 kg\r\n", "continuo"), 0.75);
		assert.equal(extrairPesoKg("   1.020\r", "continuo"), 1.02);
	});

	it("usa o último frame quando há vários", () => {
		const fluxo = `\x02000100\x03\x02000300\x03`;
		assert.equal(extrairPesoKg(fluxo, "toledo"), 0.3);
	});

	it("ignora vazio e zero", () => {
		assert.equal(extrairPesoKg("", "toledo"), 0);
		assert.equal(extrairPesoKg("\x02000000\x03", "toledo"), 0);
	});
});

describe("normalizarProtocoloBalanca", () => {
	it("aceita os três protocolos", () => {
		assert.equal(normalizarProtocoloBalanca("filizola"), "filizola");
		assert.equal(normalizarProtocoloBalanca("continuo"), "continuo");
		assert.equal(normalizarProtocoloBalanca("toledo"), "toledo");
		assert.equal(normalizarProtocoloBalanca(""), "toledo");
	});
});

describe("comandoSolicitarPeso", () => {
	it("Toledo pede com P", () => {
		assert.equal(comandoSolicitarPeso("toledo")?.toString(), "P\r");
	});
});

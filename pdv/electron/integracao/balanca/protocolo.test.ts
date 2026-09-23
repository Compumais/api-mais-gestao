import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	comandoFallbackEmuladorToledo,
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

	it("lê protocolo A da Toledo com 3 casas", () => {
		const quadro =
			"\x02\x00" + "001250" + "\x00" + "000155" + "000124" + "\r\x00";
		assert.equal(extrairPesoKg(quadro, "toledo"), 1.25);
	});

	it("lê protocolo A com 2 casas quando o bit 3 de S2 está ligado", () => {
		const quadro =
			"\x02\x00" + "001250" + "\x08" + "000000" + "000000" + "\r\x00";
		assert.equal(extrairPesoKg(quadro, "toledo"), 12.5);
	});

	it("lê protocolo B com ENQ na frente e ignora instável, negativo e sobrecarga", () => {
		assert.equal(extrairPesoKg("\x05\x02001250\x03", "toledo"), 1.25);
		assert.equal(extrairPesoKg("\x02IIIII\x03", "toledo"), 0);
		assert.equal(extrairPesoKg("\x02NNNNN\x03", "toledo"), 0);
		assert.equal(extrairPesoKg("\x02SSSSS\x03", "toledo"), 0);
	});

	it("lê protocolo C (STX + peso + CR)", () => {
		assert.equal(extrairPesoKg("\x02001250\r", "toledo"), 1.25);
		assert.equal(extrairPesoKg("\x020.450kg\r", "toledo"), 0.45);
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
	it("Toledo e Filizola pedem com ENQ, como a ACBr", () => {
		assert.equal(comandoSolicitarPeso("toledo")?.[0], 0x05);
		assert.equal(comandoSolicitarPeso("filizola")?.[0], 0x05);
		assert.equal(comandoSolicitarPeso("continuo"), null);
	});

	it("mantém P+CR só como fallback do emulador", () => {
		assert.equal(comandoFallbackEmuladorToledo().toString(), "P\r");
	});
});

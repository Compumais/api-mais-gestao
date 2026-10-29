import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	alvoEhCampoDigitacao,
	ESTADO_BUFFER_LEITOR_COMANDA_VAZIO,
	normalizarLeituraComanda,
	processarTeclaLeitorComanda,
} from "./comanda-scanner";

describe("normalizarLeituraComanda", () => {
	it("remove somente o dígito verificador e preserva zeros à esquerda", () => {
		assert.deepEqual(normalizarLeituraComanda("0012345"), {
			codigoOriginal: "0012345",
			codigoConsulta: "001234",
			valida: true,
			removeuDigitoVerificador: true,
		});
	});

	it("mantém o código original disponível para a catraca", () => {
		const leitura = normalizarLeituraComanda("000127");
		assert.equal(leitura.codigoConsulta, "00012");
		assert.equal(leitura.codigoOriginal, "000127");
	});

	it("não remove dígito de código curto ou inválido", () => {
		assert.deepEqual(normalizarLeituraComanda("7"), {
			codigoOriginal: "7",
			codigoConsulta: "7",
			valida: false,
			removeuDigitoVerificador: false,
		});
		assert.deepEqual(normalizarLeituraComanda("12A4"), {
			codigoOriginal: "12A4",
			codigoConsulta: "12A4",
			valida: false,
			removeuDigitoVerificador: false,
		});
	});
});

describe("processarTeclaLeitorComanda", () => {
	it("confirma uma sequência rápida apenas no Enter", () => {
		let estado = { ...ESTADO_BUFFER_LEITOR_COMANDA_VAZIO };
		for (const [indice, tecla] of [..."0012345"].entries()) {
			const resultado = processarTeclaLeitorComanda(estado, {
				key: tecla,
				agora: indice * 10,
			});
			estado = resultado.estado;
			assert.equal(resultado.codigoOriginal, undefined);
		}

		const resultado = processarTeclaLeitorComanda(estado, {
			key: "Enter",
			agora: 75,
		});
		assert.equal(resultado.codigoOriginal, "0012345");
		assert.equal(resultado.deveConsumirEvento, true);
		assert.equal(resultado.estado.buffer, "");
	});

	it("descarta o buffer quando a sequência expira", () => {
		const primeiro = processarTeclaLeitorComanda(
			ESTADO_BUFFER_LEITOR_COMANDA_VAZIO,
			{ key: "1", agora: 0 },
		);
		const atrasado = processarTeclaLeitorComanda(primeiro.estado, {
			key: "2",
			agora: 200,
		});
		const enter = processarTeclaLeitorComanda(atrasado.estado, {
			key: "Enter",
			agora: 210,
		});
		assert.equal(enter.codigoOriginal, undefined);
		assert.equal(enter.deveConsumirEvento, false);
	});

	it("não interfere com inputs, editores, modificadores ou F1-F12", () => {
		assert.equal(alvoEhCampoDigitacao({ tagName: "INPUT" }), true);
		assert.equal(alvoEhCampoDigitacao({ tagName: "TEXTAREA" }), true);
		assert.equal(alvoEhCampoDigitacao({ isContentEditable: true }), true);

		const emInput = processarTeclaLeitorComanda(
			{ buffer: "123", iniciadoEm: 0, ultimaTeclaEm: 20 },
			{ key: "4", agora: 30, emCampoDigitacao: true },
		);
		assert.equal(emInput.estado.buffer, "");
		assert.equal(emInput.deveConsumirEvento, false);

		for (const entrada of [
			{ key: "F4", agora: 30 },
			{ key: "1", agora: 30, comModificador: true },
		]) {
			const resultado = processarTeclaLeitorComanda(
				ESTADO_BUFFER_LEITOR_COMANDA_VAZIO,
				entrada,
			);
			assert.equal(resultado.codigoOriginal, undefined);
			assert.equal(resultado.deveConsumirEvento, false);
		}
	});
});

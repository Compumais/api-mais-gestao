import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	conflitosTeclas,
	normalizarHotkey,
	parseTeclasFuncao,
	TECLAS_FUNCAO_PADRAO,
	teclaCorresponde,
} from "./teclas-funcao";

describe("parseTeclasFuncao", () => {
	it("usa o padrão quando o JSON é inválido", () => {
		assert.deepEqual(parseTeclasFuncao("{"), TECLAS_FUNCAO_PADRAO);
	});

	it("aplica só as ações conhecidas", () => {
		const mapa = parseTeclasFuncao(
			JSON.stringify({ finalizar: "F2", desconhecido: "X" }),
		);
		assert.equal(mapa.finalizar, "F2");
		assert.equal(mapa.historico, TECLAS_FUNCAO_PADRAO.historico);
	});
});

describe("conflitosTeclas", () => {
	it("detecta tecla repetida no mesmo escopo", () => {
		const grupos = conflitosTeclas(
			{ ...TECLAS_FUNCAO_PADRAO, finalizar: "F9", fechar_caixa: "F9" },
			["finalizar", "fechar_caixa", "historico"],
		);
		assert.equal(grupos.length, 1);
		assert.deepEqual(grupos[0]?.sort(), ["fechar_caixa", "finalizar"]);
	});
});

describe("teclaCorresponde", () => {
	it("reconhece a tecla sem diferenciar maiúsculas", () => {
		assert.equal(
			teclaCorresponde(
				{
					key: "f8",
					ctrlKey: false,
					metaKey: false,
					altKey: false,
				} as KeyboardEvent,
				"F8",
			),
			true,
		);
	});
});

describe("normalizarHotkey", () => {
	it("ignora modificadores e Escape", () => {
		assert.equal(
			normalizarHotkey({
				key: "F8",
				ctrlKey: true,
				metaKey: false,
				altKey: false,
			} as KeyboardEvent),
			null,
		);
		assert.equal(
			normalizarHotkey({
				key: "Escape",
				ctrlKey: false,
				metaKey: false,
				altKey: false,
			} as KeyboardEvent),
			null,
		);
		assert.equal(
			normalizarHotkey({
				key: "a",
				ctrlKey: false,
				metaKey: false,
				altKey: false,
			} as KeyboardEvent),
			"A",
		);
	});
});

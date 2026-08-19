import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	conflitosTeclas,
	normalizarHotkey,
	parseTeclasFuncao,
	parseTeclasMeiosPagamento,
	resolverTeclasMeiosPagamento,
	serializarTeclasFuncao,
	TECLA_MEIO_NENHUMA,
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

describe("parseTeclasMeiosPagamento / resolverTeclasMeiosPagamento", () => {
	it("lê atalhos por id da forma da retaguarda", () => {
		const raw = JSON.stringify({
			...TECLAS_FUNCAO_PADRAO,
			meios: {
				"uuid-boleto": "F4",
				"uuid-visa": "F6",
			},
		});
		const meios = parseTeclasMeiosPagamento(raw);
		assert.equal(meios["uuid-boleto"], "F4");
		assert.equal(meios["uuid-visa"], "F6");
	});

	it("herda F7/F8/F10 só na primeira forma de cada meio nativo", () => {
		const resolvido = resolverTeclasMeiosPagamento(
			[
				{ id: "dinheiro-1", meio: "DINHEIRO" },
				{ id: "visa", meio: "CARTAO" },
				{ id: "master", meio: "CARTAO" },
				{ id: "boleto", meio: "OUTROS" },
			],
			TECLAS_FUNCAO_PADRAO,
			{},
		);
		assert.equal(resolvido["dinheiro-1"], "F7");
		assert.equal(resolvido.visa, "F10");
		assert.equal(resolvido.master, undefined);
		assert.equal(resolvido.boleto, undefined);
	});

	it("respeita tecla gravada e não herda depois de limpar", () => {
		const resolvido = resolverTeclasMeiosPagamento(
			[
				{ id: "visa", meio: "CARTAO" },
				{ id: "boleto", meio: "OUTROS" },
			],
			TECLAS_FUNCAO_PADRAO,
			{ visa: TECLA_MEIO_NENHUMA, boleto: "F4" },
		);
		assert.equal(resolvido.visa, undefined);
		assert.equal(resolvido.boleto, "F4");
	});

	it("serializa os atalhos das formas junto com as ações", () => {
		const json = serializarTeclasFuncao(TECLAS_FUNCAO_PADRAO, {
			"uuid-pix": "F8",
		});
		const parsed = JSON.parse(json) as { meios?: Record<string, string> };
		assert.equal(parsed.meios?.["uuid-pix"], "F8");
		assert.equal(parseTeclasFuncao(json).pix, "F8");
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

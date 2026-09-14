import { describe, expect, it } from "vitest";
import { mapearSituacaoParaInativo } from "./mapear-situacao-produto.js";

describe("mapearSituacaoParaInativo", () => {
	it("mapeia ativo para 0 e inativo para 1", () => {
		expect(mapearSituacaoParaInativo("ativo")).toBe(0);
		expect(mapearSituacaoParaInativo("inativo")).toBe(1);
	});

	it("não devolve string — todos e vazio não filtram", () => {
		expect(mapearSituacaoParaInativo("todos")).toBeUndefined();
		expect(mapearSituacaoParaInativo("")).toBeUndefined();
		expect(mapearSituacaoParaInativo(undefined)).toBeUndefined();
	});
});

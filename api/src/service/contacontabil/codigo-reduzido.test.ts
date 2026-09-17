import { describe, expect, it } from "vitest";
import { normalizarCodigoReduzido } from "./codigo-reduzido.js";

describe("normalizarCodigoReduzido", () => {
	it("mantém undefined para não alterar o campo", () => {
		expect(normalizarCodigoReduzido(undefined)).toBeUndefined();
	});

	it("converte vazio e nulo em null", () => {
		expect(normalizarCodigoReduzido(null)).toBeNull();
		expect(normalizarCodigoReduzido("")).toBeNull();
		expect(normalizarCodigoReduzido("   ")).toBeNull();
	});

	it("remove espaços das extremidades", () => {
		expect(normalizarCodigoReduzido(" 42 ")).toBe("42");
	});
});

import { describe, expect, it } from "vitest";
import {
	escolherNumeroEndereco,
	numeroEnderecoUtil,
} from "./numero-endereco-fiscal.js";

describe("numeroEnderecoUtil", () => {
	it("mantém o número do imóvel", () => {
		expect(numeroEnderecoUtil("150")).toBe("150");
		expect(numeroEnderecoUtil(" 12A ")).toBe("12A");
	});

	it("descarta SN e variações de sem número", () => {
		expect(numeroEnderecoUtil("SN")).toBeNull();
		expect(numeroEnderecoUtil("S/N")).toBeNull();
		expect(numeroEnderecoUtil("s.n.")).toBeNull();
		expect(numeroEnderecoUtil("sem número")).toBeNull();
		expect(numeroEnderecoUtil("")).toBeNull();
		expect(numeroEnderecoUtil(null)).toBeNull();
	});
});

describe("escolherNumeroEndereco", () => {
	it("ignora SN e usa o próximo número real", () => {
		expect(escolherNumeroEndereco("SN", "150")).toBe("150");
		expect(escolherNumeroEndereco("S/N", null, "88")).toBe("88");
	});

	it("retorna nulo quando nenhum candidato tem número", () => {
		expect(escolherNumeroEndereco("SN", "S/N", "")).toBeNull();
	});
});

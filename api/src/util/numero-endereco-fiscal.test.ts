import { describe, expect, it } from "vitest";
import {
	ehSemNumeroEndereco,
	resolverNumeroEndereco,
} from "./numero-endereco-fiscal.js";

describe("resolverNumeroEndereco", () => {
	it("mantém o número do imóvel", () => {
		expect(resolverNumeroEndereco("150")).toBe("150");
		expect(resolverNumeroEndereco(" 12A ")).toBe("12A");
	});

	it("grava SN quando o endereço é sem número", () => {
		expect(ehSemNumeroEndereco("SN")).toBe(true);
		expect(ehSemNumeroEndereco("S/N")).toBe(true);
		expect(ehSemNumeroEndereco("s.n.")).toBe(true);
		expect(ehSemNumeroEndereco("sem número")).toBe(true);
		expect(resolverNumeroEndereco("SN")).toBe("SN");
		expect(resolverNumeroEndereco("S/N")).toBe("SN");
		expect(resolverNumeroEndereco("")).toBe("SN");
		expect(resolverNumeroEndereco(null)).toBe("SN");
		expect(resolverNumeroEndereco("0")).toBe("SN");
		expect(resolverNumeroEndereco("00000")).toBe("SN");
	});

	it("prefere o número real quando o outro campo está SN", () => {
		expect(resolverNumeroEndereco("SN", "150")).toBe("150");
		expect(resolverNumeroEndereco("S/N", null, "88")).toBe("88");
	});
});

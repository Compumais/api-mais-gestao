import { describe, expect, it } from "vitest";
import {
	csosnExigeCreditoSn,
	resolverCreditoIcmsSnItem,
} from "./resolver-credito-icms-sn-item.js";

describe("resolverCreditoIcmsSnItem", () => {
	it("não exige crédito para CSOSN 102", () => {
		expect(csosnExigeCreditoSn("102")).toBe(false);
		expect(resolverCreditoIcmsSnItem({ csosn: "102", valorProduto: 100 })).toEqual(
			{},
		);
	});

	it("calcula pCredSN e vCredICMSSN para CSOSN 101", () => {
		const resultado = resolverCreditoIcmsSnItem({
			csosn: "101",
			valorProduto: 100,
			aliquotaIcmsInterna: "1.25",
		});

		expect(resultado).toEqual({
			pCredSN: 1.25,
			vCredICMSSN: 1.25,
		});
	});

	it("retorna pendência quando CSOSN 101 não tem alíquota", () => {
		const resultado = resolverCreditoIcmsSnItem({
			csosn: "101",
			valorProduto: 100,
		});

		expect(resultado.pendencia).toContain("pCredSN");
	});
});

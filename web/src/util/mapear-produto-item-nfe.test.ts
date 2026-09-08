import { describe, expect, it } from "vitest";
import type { ItemNfe } from "@/schemas/nfe-emissao.schema";
import {
	ehCsosn,
	itemPrecisaAliquotaIcmsParaSt,
	sugerirIcmsStPeloMva,
} from "./mapear-produto-item-nfe";

describe("ehCsosn", () => {
	it("reconhece CSOSN 300 e 400", () => {
		expect(ehCsosn("300")).toBe(true);
		expect(ehCsosn("400")).toBe(true);
		expect(ehCsosn("102")).toBe(true);
		expect(ehCsosn("00")).toBe(false);
	});
});

describe("sugerirIcmsStPeloMva", () => {
	it("deduz ICMS próprio no cálculo de ST (NF 54: 0,88)", () => {
		const item: ItemNfe = {
			descricao: "CACHAÇA BALSAMO 50ML",
			ncm: "22084000",
			cfop: "5401",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 8,
			csosn: "202",
			percentualMvaSt: 61.05,
			aliquotaIcmsSt: 18,
			aliquotaIcmsProprioSt: 18,
		};

		const resultado = sugerirIcmsStPeloMva(item);

		expect(resultado.baseIcmsSt).toBe(12.88);
		expect(resultado.valorIcmsSt).toBe(0.88);
	});

	it("mantém ST cheio sem alíquota interna para dedução", () => {
		const item: ItemNfe = {
			descricao: "Produto",
			ncm: "22084000",
			cfop: "5401",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 8,
			csosn: "202",
			percentualMvaSt: 61.05,
			aliquotaIcmsSt: 18,
		};

		const resultado = sugerirIcmsStPeloMva(item);

		expect(resultado.valorIcmsSt).toBe(2.32);
	});

	it("preserva valor manual informado no item", () => {
		const item: ItemNfe = {
			descricao: "Produto",
			ncm: "22084000",
			cfop: "5401",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 8,
			csosn: "202",
			percentualMvaSt: 61.05,
			aliquotaIcmsSt: 18,
			aliquotaIcmsProprioSt: 18,
			valorIcmsSt: 1.5,
		};

		const resultado = sugerirIcmsStPeloMva(item);

		expect(resultado.valorIcmsSt).toBeUndefined();
	});

	it("não sugere ST com MVA zerado", () => {
		expect(
			sugerirIcmsStPeloMva({
				descricao: "Produto",
				ncm: "73239300",
				cfop: "6914",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 50,
				csosn: "400",
				percentualMvaSt: 0,
				aliquotaIcmsSt: 0,
			}),
		).toEqual({});
	});
});

describe("itemPrecisaAliquotaIcmsParaSt", () => {
	it("exige alíquota interna para CSOSN 202", () => {
		expect(
			itemPrecisaAliquotaIcmsParaSt({
				csosn: "202",
				percentualMvaSt: 61.05,
				aliquotaIcmsSt: 18,
			}),
		).toBe(true);
	});

	it("não exige para CSOSN 102 sem MVA", () => {
		expect(itemPrecisaAliquotaIcmsParaSt({ csosn: "102" })).toBe(false);
	});

	it("não exige para CSOSN 400 com MVA e alíquota ST zerados", () => {
		expect(
			itemPrecisaAliquotaIcmsParaSt({
				csosn: "400",
				percentualMvaSt: 0,
				aliquotaIcmsSt: 0,
			}),
		).toBe(false);
	});
});

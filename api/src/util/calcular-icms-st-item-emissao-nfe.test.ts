import { describe, expect, it } from "vitest";
import {
	calcularBaseIcmsSt,
	calcularIcmsStItemEmissao,
	calcularValorIcmsSt,
	recalcularIcmsStItemEmissao,
} from "@/util/calcular-icms-st-item-emissao-nfe.js";

describe("calcular-icms-st-item-emissao-nfe", () => {
	it("calcula ST da NF 54 com dedução do ICMS próprio (0,88)", () => {
		const vProd = 8;
		const mva = 61.05;
		const base = calcularBaseIcmsSt(vProd, mva);
		const valor = calcularValorIcmsSt({
			vProd,
			baseIcmsSt: base,
			aliquotaIcmsSt: 18,
			aliquotaIcmsProprio: 18,
		});

		expect(base).toBe(12.88);
		expect(valor).toBe(0.88);
	});

	it("mantém ST cheio quando alíquota interna não informada", () => {
		const valor = calcularValorIcmsSt({
			vProd: 8,
			baseIcmsSt: 12.88,
			aliquotaIcmsSt: 18,
			aliquotaIcmsProprio: null,
		});

		expect(valor).toBe(2.32);
	});

	it("não retorna ST negativo quando ICMS próprio supera ST bruto", () => {
		const valor = calcularValorIcmsSt({
			vProd: 8,
			baseIcmsSt: 8,
			aliquotaIcmsSt: 7,
			aliquotaIcmsProprio: 18,
		});

		expect(valor).toBe(0);
	});

	it("recalcula item CSOSN 202 antes da emissão", () => {
		const item = recalcularIcmsStItemEmissao({
			descricao: "Produto",
			ncm: "22084000",
			cfop: "5401",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 8,
			csosn: "202",
			percentualMvaSt: 61.05,
			aliquotaIcmsSt: 18,
			aliquotaIcms: 18,
			baseIcmsSt: 12.88,
			valorIcmsSt: 2.32,
		});

		expect(item.baseIcmsSt).toBe(12.88);
		expect(item.valorIcmsSt).toBe(0.88);
	});

	it("sem alíquota interna preserva vST do cliente (evita painel×DANFE divergente)", () => {
		const item = recalcularIcmsStItemEmissao({
			descricao: "Produto",
			ncm: "22084000",
			cfop: "5401",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 8,
			csosn: "202",
			percentualMvaSt: 61.05,
			aliquotaIcmsSt: 18,
			baseIcmsSt: 12.88,
			valorIcmsSt: 0.88,
		});

		expect(item.baseIcmsSt).toBe(12.88);
		expect(item.valorIcmsSt).toBe(0.88);
	});

	it("cenário NF cachaça: ST com dedução 47,25 sobre vProd 430", () => {
		const itens = [
			{ quantidade: 3, valorUnitario: 25 },
			{ quantidade: 2, valorUnitario: 45 },
			{ quantidade: 3, valorUnitario: 45 },
			{ quantidade: 1, valorUnitario: 60 },
			{ quantidade: 1, valorUnitario: 70 },
		].map((parcial) =>
			recalcularIcmsStItemEmissao({
				descricao: "Cachaça",
				ncm: "22084000",
				cfop: "5401",
				unidade: "UN",
				csosn: "202",
				percentualMvaSt: 61.05,
				aliquotaIcmsSt: 18,
				aliquotaIcms: 18,
				...parcial,
			}),
		);

		const baseTotal = itens.reduce((acc, i) => acc + (i.baseIcmsSt ?? 0), 0);
		const stTotal = itens.reduce((acc, i) => acc + (i.valorIcmsSt ?? 0), 0);

		expect(Number(baseTotal.toFixed(2))).toBe(692.53);
		expect(Number(stTotal.toFixed(2))).toBe(47.25);
	});

	it("calcularIcmsStItemEmissao retorna vazio para item sem ST", () => {
		expect(
			calcularIcmsStItemEmissao({
				quantidade: 1,
				valorUnitario: 10,
				csosn: "102",
			}),
		).toEqual({});
	});
});

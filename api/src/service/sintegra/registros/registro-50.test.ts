import { describe, expect, it, vi } from "vitest";
import type { ItemNotaSintegra, NotaSintegra } from "../tipos-sintegra.js";
import { montarRegistro50 } from "./registro-50.js";

vi.mock("@/repositories/connection.js", () => ({
	db: {},
}));

import { agruparItensRegistro50 } from "@/repositories/sintegra-repositories.js";

function notaBase(parcial: Partial<NotaSintegra> = {}): NotaSintegra {
	return {
		id: "nota-1",
		emissao: "2025-06-15",
		dataCompetencia: "2025-07-10",
		modelo: "55",
		serie: "1",
		numero: "123",
		numeronotafiscal: "123",
		cnpjCpf: "12345678000190",
		inscricaoEstadual: "1234567890",
		uf: "MG",
		cfopCodigo: "1102",
		valorTotal: "100.00",
		baseIcms: "100.00",
		valorIcms: "12.00",
		valorIpi: "0",
		baseIcmsSt: "0",
		valorIcmsSt: "0",
		emitente: "T",
		situacao: "N",
		tipoorigem: 0,
		cancelada: false,
		...parcial,
	};
}

describe("montarRegistro50", () => {
	it("imprime a data de competência da entrada, não a emissão do fornecedor", () => {
		const linha = montarRegistro50({
			nota: notaBase(),
			cfop: "1102",
			aliquota: "12.00",
			valorTotal: 100,
			baseIcms: 100,
			valorIcms: 12,
			valorIsento: 0,
			valorOutras: 0,
		});

		expect(linha).toContain("20250710");
		expect(linha).not.toContain("20250615");
	});

	it("usa valortotalnota no registro 50 quando a nota possui ST ou encargos além do valor dos produtos (NF 281083)", () => {
		const nota = notaBase({
			id: "nota-281083",
			numero: "281083",
			numeronotafiscal: "281083",
			cfopCodigo: "1401",
			valorTotal: "305.09",
			baseIcms: "115.57",
			valorIcms: "20.80",
			baseIcmsSt: "159.49",
			valorIcmsSt: "7.91",
		});

		const item: ItemNotaSintegra = {
			id: "item-1",
			idnotafiscal: "nota-281083",
			numeroItem: 1,
			cnpjCpf: "05304733000133",
			modelo: "55",
			serie: "1",
			numero: "281083",
			cfop: "1401",
			cst: "070",
			csosn: null,
			codigoProduto: "67",
			quantidade: "7.800",
			valorProduto: "297.18",
			desconto: "0",
			baseIcms: "115.57",
			baseIcmsSt: "0",
			valorIpi: "0",
			aliquotaIcms: "18.00",
		};

		const agrupamentos = agruparItensRegistro50([nota], [item]);

		expect(agrupamentos).toHaveLength(1);
		expect(agrupamentos[0]?.valorTotal).toBeCloseTo(305.09, 2);
		expect(agrupamentos[0]?.baseIcms).toBeCloseTo(115.57, 2);
		expect(agrupamentos[0]?.valorOutras).toBeCloseTo(189.52, 2);
	});

	it("rateia valortotalnota proporcionalmente entre múltiplos grupos de CFOP/alíquota", () => {
		const nota = notaBase({
			id: "nota-multi-cfop",
			valorTotal: "110.00",
		});

		const itens: ItemNotaSintegra[] = [
			{
				id: "item-1",
				idnotafiscal: "nota-multi-cfop",
				numeroItem: 1,
				cnpjCpf: "12345678000190",
				modelo: "55",
				serie: "1",
				numero: "123",
				cfop: "1101",
				cst: "000",
				csosn: null,
				codigoProduto: "1",
				quantidade: "1",
				valorProduto: "60.00",
				desconto: "0",
				baseIcms: "60.00",
				baseIcmsSt: "0",
				valorIpi: "0",
				aliquotaIcms: "18.00",
			},
			{
				id: "item-2",
				idnotafiscal: "nota-multi-cfop",
				numeroItem: 2,
				cnpjCpf: "12345678000190",
				modelo: "55",
				serie: "1",
				numero: "123",
				cfop: "1401",
				cst: "060",
				csosn: null,
				codigoProduto: "2",
				quantidade: "1",
				valorProduto: "40.00",
				desconto: "0",
				baseIcms: "0",
				baseIcmsSt: "0",
				valorIpi: "0",
				aliquotaIcms: "0",
			},
		];

		const agrupamentos = agruparItensRegistro50([nota], itens);

		expect(agrupamentos).toHaveLength(2);
		expect(agrupamentos[0]?.valorTotal).toBeCloseTo(66.0, 2);
		expect(agrupamentos[1]?.valorTotal).toBeCloseTo(44.0, 2);
		const somaTotal = agrupamentos.reduce((s, a) => s + a.valorTotal, 0);
		expect(somaTotal).toBeCloseTo(110.0, 2);
	});
});

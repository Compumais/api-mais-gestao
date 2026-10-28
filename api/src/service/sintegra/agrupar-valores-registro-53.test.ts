import { describe, expect, it } from "vitest";
import type { AgrupamentoRegistro50, NotaSintegra } from "./tipos-sintegra.js";
import { agruparValoresRegistro53 } from "./agrupar-valores-registro-53.js";

function notaBase(parcial: Partial<NotaSintegra> & Pick<NotaSintegra, "id">): NotaSintegra {
	return {
		emissao: "2026-09-28",
		dataCompetencia: "2026-09-28",
		modelo: "55",
		serie: "5363146",
		numero: "363146",
		numeronotafiscal: "363146",
		cnpjCpf: "77595395004800",
		inscricaoEstadual: "023219980058",
		uf: "MG",
		cfopCodigo: "1101",
		valorTotal: "5440.00",
		baseIcms: "0",
		valorIcms: "0",
		valorIpi: "0",
		baseIcmsSt: "2058.60",
		valorIcmsSt: "96.00",
		emitente: "T",
		situacao: "N",
		tipoorigem: 0,
		cancelada: false,
		...parcial,
	};
}

function agrupamento(
	nota: NotaSintegra,
	cfop: string,
	valorTotal: number,
): AgrupamentoRegistro50 {
	return {
		nota,
		cfop,
		aliquota: "18.00",
		valorTotal,
		baseIcms: 0,
		valorIcms: 0,
		valorIsento: 0,
		valorOutras: valorTotal,
	};
}

describe("agruparValoresRegistro53", () => {
	it("rateia ST entre CFOPs do registro 50 (caso 77595395004800)", () => {
		const nota = notaBase({ id: "nota-st-mg" });
		const agrupamentos: AgrupamentoRegistro50[] = [
			agrupamento(nota, "1401", 2287.2),
			agrupamento(nota, "1102", 3158.0),
		];

		const registros = agruparValoresRegistro53(agrupamentos);

		expect(registros).toHaveLength(2);
		expect(registros.map((r) => r.agrupamento.cfop).sort()).toEqual([
			"1102",
			"1401",
		]);

		const somaBase = registros.reduce((s, r) => s + r.baseIcmsSt, 0);
		const somaValor = registros.reduce((s, r) => s + r.valorIcmsSt, 0);
		expect(somaBase).toBeCloseTo(2058.6, 2);
		expect(somaValor).toBeCloseTo(96, 2);
	});

	it("ignora notas sem ST no cabeçalho", () => {
		const nota = notaBase({
			id: "nota-sem-st",
			baseIcmsSt: "0",
			valorIcmsSt: "0",
		});
		const registros = agruparValoresRegistro53([
			agrupamento(nota, "1403", 100),
		]);
		expect(registros).toHaveLength(0);
	});
});

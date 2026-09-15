import { describe, expect, it } from "vitest";
import { parsearArquivoIbpt } from "./parsear-arquivo-ibpt.js";

describe("parsearArquivoIbpt", () => {
	it("consolida NCM duplicado preferindo a linha de mercadoria (alíquota estadual)", () => {
		const parseado = parsearArquivoIbpt(
			{
				versao: "26.2.A",
				uf: "MG",
				ncm: [
					{
						codigo: "11090000",
						nacionalfederal: "13.45",
						importadosfederal: "15.45",
						estadual: "18",
						municipal: "0",
						chave: "26.2.A",
						fonte: "IBPT/empresometro.com.br",
					},
					{
						codigo: "11090000",
						nacionalfederal: "13.45",
						importadosfederal: "15.45",
						estadual: "0",
						municipal: "5",
						chave: "26.2.A",
						fonte: "IBPT/empresometro.com.br",
					},
				],
			},
			"MG",
		);

		expect(parseado.registros).toHaveLength(1);
		expect(parseado.registros[0]).toMatchObject({
			ncm: "11090000",
			ex: "0",
			aliquotaEstadual: 18,
			aliquotaMunicipal: 0,
		});
	});

	it("ignora registros de serviço (NBS/LC116) quando o tipo vem na API", () => {
		const parseado = parsearArquivoIbpt(
			{
				versao: "26.2.A",
				uf: "MG",
				ncm: [
					{
						codigo: "19059090",
						tipo: 0,
						nacionalfederal: "13.45",
						importadosfederal: "15.45",
						estadual: "18",
						municipal: "0",
						chave: "26.2.A",
					},
					{
						codigo: "19059090",
						tipo: 1,
						nacionalfederal: "13.45",
						importadosfederal: "15.45",
						estadual: "0",
						municipal: "5",
						chave: "26.2.A",
					},
				],
			},
			"MG",
		);

		expect(parseado.registros).toHaveLength(1);
		expect(parseado.registros[0]?.ncm).toBe("19059090");
		expect(parseado.registros[0]?.aliquotaEstadual).toBe(18);
	});
});

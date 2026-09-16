import { describe, expect, it } from "vitest";
import {
	agregarResumoNfceDiario,
	classificarValoresSemIcms,
} from "./agregar-resumo-nfce.js";

describe("classificarValoresSemIcms", () => {
	it("coloca o total em Outras quando não há base de ICMS (Simples/CSOSN 102)", () => {
		expect(
			classificarValoresSemIcms({ valorTotal: 214, baseIcms: 0 }),
		).toEqual({ valorIsento: 0, valorOutras: 214 });
	});

	it("mantém o remanescente em Outras quando há base parcial", () => {
		expect(
			classificarValoresSemIcms({
				valorTotal: 100,
				baseIcms: 80,
				valorIsento: 5,
			}),
		).toEqual({ valorIsento: 5, valorOutras: 15 });
	});
});

describe("agregarResumoNfceDiario", () => {
	it("usa o menor e o maior número do dia, independente da ordem de emissão", () => {
		const resumos = agregarResumoNfceDiario([
			{
				emissao: "2026-09-04T20:00:00-03:00",
				modelo: "65",
				serie: "1",
				numero: "22789",
				valorTotal: "10.00",
				baseIcms: "0",
				valorIcms: "0",
				aliquota: "0",
			},
			{
				emissao: "2026-09-04T10:00:00-03:00",
				modelo: "65",
				serie: "1",
				numero: "22788",
				valorTotal: "20.00",
				baseIcms: "0",
				valorIcms: "0",
				aliquota: "0",
			},
			{
				emissao: "2026-09-04T18:00:00-03:00",
				modelo: "65",
				serie: "1",
				numero: "22825",
				valorTotal: "30.00",
				baseIcms: "0",
				valorIcms: "0",
				aliquota: "0",
			},
		]);

		expect(resumos).toHaveLength(1);
		expect(resumos[0]).toMatchObject({
			data: "2026-09-04",
			numeroInicial: "22788",
			numeroFinal: "22825",
			valorTotal: "60.00",
			baseIcms: "0.00",
			valorIcms: "0.00",
			valorIsento: "0.00",
			valorOutras: "60.00",
		});
	});

	it("inclui cancelada na faixa numérica sem somar valor", () => {
		const resumos = agregarResumoNfceDiario([
			{
				emissao: "2026-09-01",
				modelo: "65",
				serie: "1",
				numero: "22731",
				valorTotal: "11.00",
				baseIcms: "0",
				valorIcms: "0",
				aliquota: "0",
			},
			{
				emissao: "2026-09-01",
				modelo: "65",
				serie: "1",
				numero: "22739",
				valorTotal: "50.00",
				baseIcms: "0",
				valorIcms: "0",
				aliquota: "0",
				cancelada: true,
			},
			{
				emissao: "2026-09-01",
				modelo: "65",
				serie: "1",
				numero: "22741",
				valorTotal: "20.00",
				baseIcms: "0",
				valorIcms: "0",
				aliquota: "0",
			},
		]);

		expect(resumos).toHaveLength(1);
		expect(resumos[0]).toMatchObject({
			numeroInicial: "22731",
			numeroFinal: "22741",
			valorTotal: "31.00",
			valorOutras: "31.00",
		});
	});
});

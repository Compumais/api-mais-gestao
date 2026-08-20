import { describe, expect, it } from "vitest";
import { regraVigenteNaData } from "./regra-vigente.js";
import { resolverRegrasFiscais } from "./resolver-regras-fiscais.js";

describe("regraVigenteNaData", () => {
	it("aceita data dentro da vigência aberta", () => {
		expect(
			regraVigenteNaData({
				vigenciaInicio: "2020-01-01",
				vigenciaFim: null,
				dataOperacao: "2026-08-19T18:17:06-03:00",
			}),
		).toBe(true);
	});

	it("rejeita data após vigencia_fim", () => {
		expect(
			regraVigenteNaData({
				vigenciaInicio: "2010-01-01",
				vigenciaFim: "2020-12-31",
				dataOperacao: "2026-08-19",
			}),
		).toBe(false);
	});
});

describe("resolverRegrasFiscais", () => {
	it("ignora regra fora da vigência e ordena por prioridade", () => {
		const vigentes = resolverRegrasFiscais({
			contexto: {
				dataOperacao: "2026-08-19",
				ufEmitente: "MG",
				ncm: "22084000",
			},
			regras: [
				{
					ruleId: "A",
					prioridade: 10,
					vigenciaInicio: "2000-01-01",
					status: "validado",
					condicoes: { escopo: "operacao", ncm: "22084000" },
					resultado: {},
				},
				{
					ruleId: "B",
					prioridade: 90,
					vigenciaInicio: "2000-01-01",
					vigenciaFim: "2010-01-01",
					status: "validado",
					condicoes: { escopo: "operacao", ncm: "22084000" },
					resultado: {},
				},
				{
					ruleId: "C",
					prioridade: 50,
					vigenciaInicio: "2000-01-01",
					status: "validado",
					condicoes: { escopo: "operacao", ncm: "22084000" },
					resultado: {},
				},
			],
		});

		expect(vigentes.map((regra) => regra.ruleId)).toEqual(["C", "A"]);
	});
});

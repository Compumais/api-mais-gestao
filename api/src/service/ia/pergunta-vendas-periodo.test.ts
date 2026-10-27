import { describe, expect, it } from "vitest";
import { interpretarPerguntaVendasPeriodo } from "./pergunta-vendas-periodo.js";

const OUTUBRO = new Date("2026-10-27T15:00:00.000Z");

describe("interpretarPerguntaVendasPeriodo", () => {
	it("entende vendas do mês corrente", () => {
		expect(interpretarPerguntaVendasPeriodo("vendas do mês", OUTUBRO)).toEqual({
			dataInicio: "2026-10-01",
			dataFim: "2026-10-31",
			rotulo: "outubro/2026",
		});
	});

	it("entende faturamento do mês passado", () => {
		expect(
			interpretarPerguntaVendasPeriodo(
				"qual o faturamento do mês passado?",
				OUTUBRO,
			),
		).toEqual({
			dataInicio: "2026-09-01",
			dataFim: "2026-09-30",
			rotulo: "setembro/2026",
		});
	});

	it("não trata pergunta de um pedido como resumo do mês", () => {
		expect(
			interpretarPerguntaVendasPeriodo("vendas do pedido 15 neste mês", OUTUBRO),
		).toBeNull();
	});

	it("ignora assunto que não é vendas", () => {
		expect(interpretarPerguntaVendasPeriodo("Oi", OUTUBRO)).toBeNull();
	});
});

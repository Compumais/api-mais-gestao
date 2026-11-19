import { describe, expect, it } from "vitest";
import {
	calcularDataPrevistaLocacao,
	calcularItemLocacao,
} from "./locacao-calculo.js";

describe("calcularItemLocacao", () => {
	it("cobra só o período quando a devolução é no dia previsto", () => {
		const calculo = calcularItemLocacao({
			datainicio: "2026-11-01",
			periodo: "mensal",
			quantidade: 1,
			valorunitario: 300,
			valordiaria: 20,
			datadevolucao: "2026-11-30",
		});

		expect(calcularDataPrevistaLocacao("2026-11-01", "mensal", 1)).toBe(
			"2026-11-30",
		);
		expect(calculo.diasatraso).toBe(0);
		expect(calculo.valormora).toBe(0);
		expect(calculo.valortotal).toBe(300);
	});

	it("soma a diária de cada dia depois da data prevista", () => {
		const calculo = calcularItemLocacao({
			datainicio: "2026-11-01",
			periodo: "mensal",
			quantidade: 1,
			valorunitario: 300,
			valordiaria: 20,
			datadevolucao: "2026-12-02",
		});

		expect(calculo.dataprevista).toBe("2026-11-30");
		expect(calculo.diasatraso).toBe(2);
		expect(calculo.valormora).toBe(40);
		expect(calculo.valortotal).toBe(340);
	});

	it("não reduz o período quando a devolução é antecipada", () => {
		const calculo = calcularItemLocacao({
			datainicio: "2026-11-01",
			periodo: "semanal",
			quantidade: 2,
			valorunitario: 80,
			valordiaria: 15,
			datadevolucao: "2026-11-05",
		});

		expect(calculo.dataprevista).toBe("2026-11-14");
		expect(calculo.valorperiodo).toBe(160);
		expect(calculo.diasatraso).toBe(0);
		expect(calculo.valortotal).toBe(160);
	});

	it("trata a diária contratada como um dia, com acréscimo no dia seguinte", () => {
		const noDia = calcularItemLocacao({
			datainicio: "2026-11-01",
			periodo: "diaria",
			quantidade: 1,
			valorunitario: 50,
			valordiaria: 50,
			datadevolucao: "2026-11-01",
		});
		const atrasada = calcularItemLocacao({
			datainicio: "2026-11-01",
			periodo: "diaria",
			quantidade: 1,
			valorunitario: 50,
			valordiaria: 50,
			datadevolucao: "2026-11-02",
		});

		expect(noDia.valortotal).toBe(50);
		expect(atrasada.diasatraso).toBe(1);
		expect(atrasada.valortotal).toBe(100);
	});
});

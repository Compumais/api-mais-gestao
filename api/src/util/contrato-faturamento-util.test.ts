import { describe, expect, it } from "vitest";
import {
	avaliarPendenciasContrato,
	calcularVencimentoCompetencia,
	competenciaCobreVigencia,
	parseCompetencia,
} from "./contrato-faturamento-util.js";

describe("contrato-faturamento-util", () => {
	it("parseCompetencia valida YYYY-MM", () => {
		expect(parseCompetencia("2026-11")).toEqual({ ano: 2026, mes: 11 });
		expect(parseCompetencia("2026-13")).toBeNull();
		expect(parseCompetencia("11/2026")).toBeNull();
	});

	it("calcula vencimento no mês atual e seguinte", () => {
		expect(calcularVencimentoCompetencia("2026-11", 10, "mes_atual")).toBe(
			"2026-11-10",
		);
		expect(calcularVencimentoCompetencia("2026-11", 10, "mes_seguinte")).toBe(
			"2026-12-10",
		);
		expect(calcularVencimentoCompetencia("2026-12", 5, "mes_seguinte")).toBe(
			"2027-01-05",
		);
	});

	it("avalia vigência da competência", () => {
		expect(
			competenciaCobreVigencia(
				{ datainicio: "2026-01-01", datafim: null },
				"2026-11",
			),
		).toBe(true);
		expect(
			competenciaCobreVigencia(
				{ datainicio: "2027-01-01", datafim: null },
				"2026-11",
			),
		).toBe(false);
		expect(
			competenciaCobreVigencia(
				{ datainicio: "2026-01-01", datafim: "2026-10-31" },
				"2026-11",
			),
		).toBe(false);
	});

	it("marca já faturado e elegível corretamente", () => {
		const base = {
			id: "c1",
			idempresa: "e1",
			identidade: "cli1",
			codigo: "1",
			descricao: "Teste",
			situacao: "ativo",
			datainicio: "2026-01-01",
			datafim: null,
			valor: "100.00",
			periodicidade: "mensal",
			diavencimento: 10,
			regracompetencia: "mes_atual",
			fluxofaturamento: 3,
			discriminacao: null,
			itemlistaservico: null,
			codigonbs: null,
			codigotributacaonacional: null,
			idcondicaopagto: null,
			idtipodocumento: "td1",
			idplanocontas: null,
			idcontacorrente: null,
			idtipocobranca: null,
			observacao: null,
			criadoem: new Date().toISOString(),
			atualizadoem: new Date().toISOString(),
		};

		const elegivel = avaliarPendenciasContrato({
			contrato: base,
			competencia: "2026-11",
		});
		expect(elegivel.elegivel).toBe(true);

		const jaFaturado = avaliarPendenciasContrato({
			contrato: base,
			competencia: "2026-11",
			cobrancaExistente: {
				id: "cob1",
				statusfaturamento: "concluido",
			},
		});
		expect(jaFaturado.elegivel).toBe(false);
		expect(jaFaturado.pendencias).toContain("ja_faturado");
	});
});

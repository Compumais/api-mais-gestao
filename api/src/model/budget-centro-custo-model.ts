import type { budgetcentrocusto } from "@/repositories/schema.js";

export type BudgetCentroCusto = typeof budgetcentrocusto.$inferSelect;
export type NovoBudgetCentroCusto = typeof budgetcentrocusto.$inferInsert;

export type BudgetCentroCustoAcompanhamentoItem = {
	idcentrocusto: string;
	centrocustocodigo: string | null;
	centrocustonome: string;
	idplanocontas: string | null;
	planocontascodigo: string | null;
	planocontasnome: string | null;
	limite: number;
	realizado: number;
	saldo: number;
	excesso: number;
	percentualExecucao: number;
	variacaoAbsoluta: number;
	variacaoPercentual: number | null;
};

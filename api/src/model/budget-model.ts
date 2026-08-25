import type * as schema from "@/repositories/schema.js";

export type Budget = typeof schema.budget.$inferSelect;
export type NovoBudget = typeof schema.budget.$inferInsert;

export type BudgetComPlanoContas = Budget & {
	planocontascodigo: string | null;
	planocontasnome: string | null;
};

export type BudgetAcompanhamentoItem = {
	idplanocontas: string;
	planocontascodigo: string | null;
	planocontasnome: string | null;
	periodicidade: string;
	limite: number;
	realizado: number;
	saldo: number;
	percentual: number;
};

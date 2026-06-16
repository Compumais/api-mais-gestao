import type * as schema from "@/repositories/schema.js";

export type NovoMotivoBaixaFinanceiro =
	typeof schema.motivobaixafinanceiro.$inferInsert;

export type MotivoBaixaFinanceiro =
	typeof schema.motivobaixafinanceiro.$inferSelect;

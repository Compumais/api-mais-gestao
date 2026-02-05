import type * as schema from "../../drizzle/schema";

export type NovoFinanceiroLancamento =
	typeof schema.financeirolancamento.$inferInsert;

export type FinanceiroLancamento =
	typeof schema.financeirolancamento.$inferSelect;

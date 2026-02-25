import type * as schema from "../../drizzle/schema.js";

export type Financeiro = typeof schema.financeiro.$inferSelect;
export type NovoFinanceiro = typeof schema.financeiro.$inferInsert;

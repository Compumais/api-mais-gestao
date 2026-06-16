import type * as schema from "@/repositories/schema.js";

export type Financeiro = typeof schema.financeiro.$inferSelect;
export type NovoFinanceiro = typeof schema.financeiro.$inferInsert;

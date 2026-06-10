import type * as schema from "@/repositories/schema";

export type Financeiro = typeof schema.financeiro.$inferSelect;
export type NovoFinanceiro = typeof schema.financeiro.$inferInsert;

import type * as schema from "@/repositories/schema.js";

export type PlanoContas = typeof schema.planocontas.$inferSelect;
export type NovoPlanoContas = typeof schema.planocontas.$inferInsert;

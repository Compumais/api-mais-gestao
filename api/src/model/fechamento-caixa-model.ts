import type { fechamentopdv } from "@/repositories/schema";

export type FechamentoCaixa = typeof fechamentopdv.$inferSelect;
export type NovoFechamentoCaixa = typeof fechamentopdv.$inferInsert;

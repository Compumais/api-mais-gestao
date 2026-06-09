import type { receitasemcontribuicao } from "@/repositories/schema";

export type ReceitaSemContribuicao = typeof receitasemcontribuicao.$inferSelect;
export type NovoReceitaSemContribuicao = typeof receitasemcontribuicao.$inferInsert;

import type { receitasemcontribuicao } from "@/repositories/schema.js";

export type ReceitaSemContribuicao = typeof receitasemcontribuicao.$inferSelect;
export type NovoReceitaSemContribuicao =
	typeof receitasemcontribuicao.$inferInsert;

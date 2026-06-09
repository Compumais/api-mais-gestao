import type { ordemservico } from "@/repositories/schema";

export type OrdemServico = typeof ordemservico.$inferSelect;
export type NovoOrdemServico = typeof ordemservico.$inferInsert;

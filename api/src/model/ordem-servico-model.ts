import type { ordemservico } from "@/repositories/schema.js";

export type OrdemServico = typeof ordemservico.$inferSelect;
export type NovoOrdemServico = typeof ordemservico.$inferInsert;

import type { ordemservicoevento } from "@/repositories/schema.js";

export type OrdemServicoEvento = typeof ordemservicoevento.$inferSelect;
export type NovoOrdemServicoEvento = typeof ordemservicoevento.$inferInsert;

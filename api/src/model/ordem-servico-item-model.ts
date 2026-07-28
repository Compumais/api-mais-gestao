import type { ordemservicoitem } from "@/repositories/schema.js";

export type OrdemServicoItem = typeof ordemservicoitem.$inferSelect;
export type NovoOrdemServicoItem = typeof ordemservicoitem.$inferInsert;

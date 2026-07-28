import type { ordemservicoitemlote } from "@/repositories/schema.js";

export type OrdemServicoItemLote = typeof ordemservicoitemlote.$inferSelect;
export type NovoOrdemServicoItemLote = typeof ordemservicoitemlote.$inferInsert;

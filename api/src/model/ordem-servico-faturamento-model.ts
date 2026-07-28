import type { ordemservicofaturamento } from "@/repositories/schema.js";

export type OrdemServicoFaturamento =
	typeof ordemservicofaturamento.$inferSelect;
export type NovoOrdemServicoFaturamento =
	typeof ordemservicofaturamento.$inferInsert;

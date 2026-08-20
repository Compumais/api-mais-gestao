import type { modeloimpressaoordemservico } from "@/repositories/schema.js";

export type ModeloImpressaoOrdemServico =
	typeof modeloimpressaoordemservico.$inferSelect;
export type NovoModeloImpressaoOrdemServico =
	typeof modeloimpressaoordemservico.$inferInsert;

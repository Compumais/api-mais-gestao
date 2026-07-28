import type { configuracaoordemservico } from "@/repositories/schema.js";

export type ConfiguracaoOrdemServico =
	typeof configuracaoordemservico.$inferSelect;
export type NovaConfiguracaoOrdemServico =
	typeof configuracaoordemservico.$inferInsert;

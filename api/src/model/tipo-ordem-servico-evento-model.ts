import type { tipoordemservicoevento } from "@/repositories/schema.js";

export type TipoOrdemServicoEvento =
	typeof tipoordemservicoevento.$inferSelect;
export type NovoTipoOrdemServicoEvento =
	typeof tipoordemservicoevento.$inferInsert;

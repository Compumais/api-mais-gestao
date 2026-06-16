import type { unidademedida } from "@/repositories/schema.js";

export type UnidadeMedida = typeof unidademedida.$inferSelect;
export type NovoUnidadeMedida = typeof unidademedida.$inferInsert;

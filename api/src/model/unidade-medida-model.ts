import type { unidademedida } from "@/repositories/schema";

export type UnidadeMedida = typeof unidademedida.$inferSelect;
export type NovoUnidadeMedida = typeof unidademedida.$inferInsert;

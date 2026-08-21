import type { fichaproducaoitem } from "@/repositories/schema.js";

export type FichaProducaoItem = typeof fichaproducaoitem.$inferSelect;
export type NovoFichaProducaoItem = typeof fichaproducaoitem.$inferInsert;

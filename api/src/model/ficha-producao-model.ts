import type { fichaproducao } from "@/repositories/schema.js";

export type FichaProducao = typeof fichaproducao.$inferSelect;
export type NovaFichaProducao = typeof fichaproducao.$inferInsert;

import type { grupogourmet } from "@/repositories/schema.js";

export type GrupoGourmet = typeof grupogourmet.$inferSelect;
export type NovoGrupoGourmet = typeof grupogourmet.$inferInsert;

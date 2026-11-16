import type { grupocontrato } from "@/repositories/schema.js";

export type GrupoContrato = typeof grupocontrato.$inferSelect;
export type NovoGrupoContrato = typeof grupocontrato.$inferInsert;

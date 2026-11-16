import type { tipocontrato } from "@/repositories/schema.js";

export type TipoContrato = typeof tipocontrato.$inferSelect;
export type NovoTipoContrato = typeof tipocontrato.$inferInsert;

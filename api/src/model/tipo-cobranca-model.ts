import type { tipocobranca } from "@/repositories/schema.js";

export type TipoCobranca = typeof tipocobranca.$inferSelect;
export type NovoTipoCobranca = typeof tipocobranca.$inferInsert;

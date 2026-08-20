import type { lote, notafiscalitemlote } from "@/repositories/schema.js";

export type Lote = typeof lote.$inferSelect;
export type NovoLote = typeof lote.$inferInsert;
export type NotaFiscalItemLote = typeof notafiscalitemlote.$inferSelect;
export type NovoNotaFiscalItemLote = typeof notafiscalitemlote.$inferInsert;

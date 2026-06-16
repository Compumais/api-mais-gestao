import type { notafiscalitem } from "@/repositories/schema.js";

export type NotaFiscalItem = typeof notafiscalitem.$inferSelect;
export type NovoNotaFiscalItem = typeof notafiscalitem.$inferInsert;

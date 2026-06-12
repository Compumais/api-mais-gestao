import type { notafiscal } from "@/repositories/schema";

export type NotaFiscal = typeof notafiscal.$inferSelect;
export type NovaNotaFiscal = typeof notafiscal.$inferInsert;

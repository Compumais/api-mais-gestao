import type { saldoestoque } from "@/repositories/schema.js";

export type SaldoEstoque = typeof saldoestoque.$inferSelect;
export type NovoSaldoEstoque = typeof saldoestoque.$inferInsert;

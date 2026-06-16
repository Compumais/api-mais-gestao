import type { saldoestoque } from "@/repositories/schema";

export type SaldoEstoque = typeof saldoestoque.$inferSelect;
export type NovoSaldoEstoque = typeof saldoestoque.$inferInsert;

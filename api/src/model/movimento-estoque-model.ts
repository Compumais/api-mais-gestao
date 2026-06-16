import type { movimentoestoque } from "@/repositories/schema.js";

export type MovimentoEstoque = typeof movimentoestoque.$inferSelect;
export type NovoMovimentoEstoque = typeof movimentoestoque.$inferInsert;


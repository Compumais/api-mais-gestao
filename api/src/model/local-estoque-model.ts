import type { localestoque } from "@/repositories/schema";

export type LocalEstoque = typeof localestoque.$inferSelect;
export type NovoLocalEstoque = typeof localestoque.$inferInsert;

import type { produtos } from "@/repositories/schema";

export type Produto = typeof produtos.$inferSelect;
export type NovoProduto = typeof produtos.$inferInsert;

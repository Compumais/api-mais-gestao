import type * as schema from "@/repositories/schema";

export type Produto = typeof schema.produtos.$inferSelect;
export type NovoProduto = typeof schema.produtos.$inferInsert;

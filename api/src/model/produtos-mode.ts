import type * as schema from "@/repositories/schema.js";

export type Produto = typeof schema.produtos.$inferSelect;
export type NovoProduto = typeof schema.produtos.$inferInsert;

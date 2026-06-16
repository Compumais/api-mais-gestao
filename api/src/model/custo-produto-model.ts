import type { custoproduto } from "@/repositories/schema.js";

export type CustoProduto = typeof custoproduto.$inferSelect;
export type NovoCustoProduto = typeof custoproduto.$inferInsert;

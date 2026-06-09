import type * as schema from "@/repositories/schema";

export type Banco = typeof schema.banco.$inferSelect;
export type NovoBanco = typeof schema.banco.$inferInsert;

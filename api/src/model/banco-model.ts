import type * as schema from "../../drizzle/schema.js";

export type Banco = typeof schema.banco.$inferSelect;
export type NovoBanco = typeof schema.banco.$inferInsert;

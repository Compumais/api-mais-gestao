import type * as schema from "../../drizzle/schema.js";

export type ContaCorrente = typeof schema.contacorrente.$inferSelect;
export type NovaContaCorrente = typeof schema.contacorrente.$inferInsert;

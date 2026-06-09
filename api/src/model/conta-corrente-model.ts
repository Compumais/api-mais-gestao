import type * as schema from "@/repositories/schema";

export type ContaCorrente = typeof schema.contacorrente.$inferSelect;
export type NovaContaCorrente = typeof schema.contacorrente.$inferInsert;

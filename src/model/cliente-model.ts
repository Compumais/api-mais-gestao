import type * as schema from "../../drizzle/schema";

export type Cliente = typeof schema.cliente.$inferSelect;
export type NovoCliente = typeof schema.cliente.$inferInsert;

import type * as schema from "@/repositories/schema.js";

export type RetornoBancario = typeof schema.retornobancario.$inferSelect;
export type NovoRetornoBancario = typeof schema.retornobancario.$inferInsert;
export type RetornoBancarioItem = typeof schema.retornobancarioitem.$inferSelect;
export type NovoRetornoBancarioItem =
	typeof schema.retornobancarioitem.$inferInsert;

import type * as schema from "../../drizzle/schema.js";

export type ContaCorrenteLancamento =
	typeof schema.contacorrentelancamento.$inferSelect;

export type NovaContaCorrenteLancamento =
	typeof schema.contacorrentelancamento.$inferInsert;

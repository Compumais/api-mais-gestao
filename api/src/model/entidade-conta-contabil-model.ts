import type { entidadecontacontabil } from "@/repositories/schema.js";

export type EntidadeContaContabil = typeof entidadecontacontabil.$inferSelect;
export type NovoEntidadeContaContabil =
	typeof entidadecontacontabil.$inferInsert;

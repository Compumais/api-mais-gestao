import type { entidadecontacontabil } from "@/repositories/schema";

export type EntidadeContaContabil = typeof entidadecontacontabil.$inferSelect;
export type NovoEntidadeContaContabil =
	typeof entidadecontacontabil.$inferInsert;

import type { planocontascontacontabil } from "@/repositories/schema.js";

export type PlanoContasContaContabil =
	typeof planocontascontacontabil.$inferSelect;
export type NovoPlanoContasContaContabil =
	typeof planocontascontacontabil.$inferInsert;

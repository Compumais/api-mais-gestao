import type { bandeiracartao } from "@/repositories/schema.js";

export type BandeiraCartao = typeof bandeiracartao.$inferSelect;
export type NovaBandeiraCartao = typeof bandeiracartao.$inferInsert;

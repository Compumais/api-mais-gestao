import type { fatorconversao } from "@/repositories/schema.js";

export type FatorConversao = typeof fatorconversao.$inferSelect;
export type NovoFatorConversao = typeof fatorconversao.$inferInsert;

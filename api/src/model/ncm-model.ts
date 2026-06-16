import type { ncm } from "@/repositories/schema.js";

export type NCM = typeof ncm.$inferSelect;
export type NovoNCM = typeof ncm.$inferInsert;

import type { ncm } from "@/repositories/schema";

export type NCM = typeof ncm.$inferSelect;
export type NovoNCM = typeof ncm.$inferInsert;

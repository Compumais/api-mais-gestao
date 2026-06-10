import type { cfop } from "@/repositories/schema";

export type CFOP = typeof cfop.$inferSelect;
export type NovoCFOP = typeof cfop.$inferInsert;

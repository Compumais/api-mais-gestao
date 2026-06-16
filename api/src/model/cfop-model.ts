import type { cfop } from "@/repositories/schema.js";

export type CFOP = typeof cfop.$inferSelect;
export type NovoCFOP = typeof cfop.$inferInsert;

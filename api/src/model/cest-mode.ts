import type { cest } from "@/repositories/schema.js";

export type CEST = typeof cest.$inferSelect;
export type NovoCEST = typeof cest.$inferInsert;

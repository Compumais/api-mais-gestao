import type { cest } from "@/repositories/schema";

export type CEST = typeof cest.$inferSelect;
export type NovoCEST = typeof cest.$inferInsert;

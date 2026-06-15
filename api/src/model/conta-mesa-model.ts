import type { contamesa } from "@/repositories/schema";

export type ContaMesa = typeof contamesa.$inferSelect;
export type NovaContaMesa = typeof contamesa.$inferInsert;

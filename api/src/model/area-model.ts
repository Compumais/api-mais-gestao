import type { area } from "@/repositories/schema.js";

export type Area = typeof area.$inferSelect;
export type NovoArea = typeof area.$inferInsert;

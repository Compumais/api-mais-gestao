import type { area } from "@/repositories/schema";

export type Area = typeof area.$inferSelect;
export type NovoArea = typeof area.$inferInsert;

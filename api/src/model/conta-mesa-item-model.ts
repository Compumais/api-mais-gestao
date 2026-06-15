import type { contamesaitem } from "@/repositories/schema";

export type ContaMesaItem = typeof contamesaitem.$inferSelect;
export type NovoContaMesaItem = typeof contamesaitem.$inferInsert;

import type { contamesaitem } from "@/repositories/schema.js";

export type ContaMesaItem = typeof contamesaitem.$inferSelect;
export type NovoContaMesaItem = typeof contamesaitem.$inferInsert;

import type { prioridades } from "@/repositories/schema.js";

export type Prioridade = typeof prioridades.$inferSelect;
export type NovoPrioridade = typeof prioridades.$inferInsert;

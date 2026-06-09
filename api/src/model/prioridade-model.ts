import type { prioridades } from "@/repositories/schema";

export type Prioridade = typeof prioridades.$inferSelect;
export type NovoPrioridade = typeof prioridades.$inferInsert;

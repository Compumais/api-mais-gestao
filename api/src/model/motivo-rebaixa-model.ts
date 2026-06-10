import type { motivorebaixa } from "@/repositories/schema";

export type MotivoRebaixa = typeof motivorebaixa.$inferSelect;
export type NovoMotivoRebaixa = typeof motivorebaixa.$inferInsert;

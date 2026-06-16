import type { motivorebaixa } from "@/repositories/schema.js";

export type MotivoRebaixa = typeof motivorebaixa.$inferSelect;
export type NovoMotivoRebaixa = typeof motivorebaixa.$inferInsert;

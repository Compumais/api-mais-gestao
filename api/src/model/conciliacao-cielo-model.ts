import type { conciliacaocielo, conciliacaocieloitem } from "@/repositories/schema.js";

export type ConciliacaoCielo = typeof conciliacaocielo.$inferSelect;
export type NovaConciliacaoCielo = typeof conciliacaocielo.$inferInsert;
export type ConciliacaoCieloItem = typeof conciliacaocieloitem.$inferSelect;
export type NovoConciliacaoCieloItem = typeof conciliacaocieloitem.$inferInsert;

export const STATUS_CONCILIACAO_CIELO = {
	IMPORTADO: "importado",
	PARCIAL: "parcial",
	CONCLUIDO: "concluido",
} as const;

export const STATUS_CONCILIACAO_CIELO_ITEM = {
	PENDENTE: "pendente",
	ASSOCIADO: "associado",
	CONFIRMADO: "confirmado",
	IGNORADO: "ignorado",
	ERRO: "erro",
} as const;

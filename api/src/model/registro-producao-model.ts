import type { registroproducao } from "@/repositories/schema.js";

export type RegistroProducao = typeof registroproducao.$inferSelect;
export type NovoRegistroProducao = typeof registroproducao.$inferInsert;

/** origem: 0 = massa, 1 = venda */
export const ORIGEM_PRODUCAO = {
	MASSA: 0,
	VENDA: 1,
} as const;

export type OrigemProducao =
	(typeof ORIGEM_PRODUCAO)[keyof typeof ORIGEM_PRODUCAO];

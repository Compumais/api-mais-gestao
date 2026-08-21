import type { registroproducaoitem } from "@/repositories/schema.js";

export type RegistroProducaoItem = typeof registroproducaoitem.$inferSelect;
export type NovoRegistroProducaoItem = typeof registroproducaoitem.$inferInsert;

/** tipo: 0 = consumo, 1 = produção */
export const TIPO_ITEM_PRODUCAO = {
	CONSUMO: 0,
	PRODUCAO: 1,
} as const;

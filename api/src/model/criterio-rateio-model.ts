import type {
	criteriorateio,
	criteriorateiolinha,
} from "@/repositories/schema.js";

export type CriterioRateio = typeof criteriorateio.$inferSelect;
export type NovoCriterioRateio = typeof criteriorateio.$inferInsert;
export type CriterioRateioLinha = typeof criteriorateiolinha.$inferSelect;
export type NovaCriterioRateioLinha = typeof criteriorateiolinha.$inferInsert;

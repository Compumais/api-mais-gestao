import type { integracaocontabilconfiguracao } from "@/repositories/schema.js";

export type IntegracaoContabilConfiguracao =
	typeof integracaocontabilconfiguracao.$inferSelect;
export type NovoIntegracaoContabilConfiguracao =
	typeof integracaocontabilconfiguracao.$inferInsert;

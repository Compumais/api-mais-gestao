import type { integracaocontabilconfiguracao } from "@/repositories/schema";

export type IntegracaoContabilConfiguracao =
	typeof integracaocontabilconfiguracao.$inferSelect;
export type NovoIntegracaoContabilConfiguracao =
	typeof integracaocontabilconfiguracao.$inferInsert;

import type { tipodocumentofinanceiro } from "@/repositories/schema";

export type TipoDocumentoFinanceiro =
	typeof tipodocumentofinanceiro.$inferSelect;
export type NovoTipoDocumentoFinanceiro =
	typeof tipodocumentofinanceiro.$inferInsert;

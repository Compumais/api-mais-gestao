import type { tipodocumentofinanceiro } from "@/repositories/schema.js";

export type TipoDocumentoFinanceiro =
	typeof tipodocumentofinanceiro.$inferSelect;
export type NovoTipoDocumentoFinanceiro =
	typeof tipodocumentofinanceiro.$inferInsert;

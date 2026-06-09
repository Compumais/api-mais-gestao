import type { codigoreduzidocontacontabil } from "@/repositories/schema";

export type CodigoReduzidoContaContabil =
	typeof codigoreduzidocontacontabil.$inferSelect;

export type NovoCodigoReduzidoContaContabil =
	typeof codigoreduzidocontacontabil.$inferInsert;

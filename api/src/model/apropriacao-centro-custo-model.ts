import type { apropriacaocentrocusto } from "@/repositories/schema.js";

export type ApropriacaoCentroCusto =
	typeof apropriacaocentrocusto.$inferSelect;
export type NovaApropriacaoCentroCusto =
	typeof apropriacaocentrocusto.$inferInsert;

export type LinhaApropriacaoInput = {
	idcentrocusto: string;
	valor?: string | number;
	percentual?: string | number | null;
};

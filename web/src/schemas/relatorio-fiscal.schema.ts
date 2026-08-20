import { z } from "zod";

export const relatorioAuditoriaFiscalSchema = z.object({
	operacao_id: z.string(),
	classificacao_final: z.string(),
	permitir_transmissao: z.boolean(),
	operacao: z.object({
		interna_interestadual: z.string(),
		tipo: z.string(),
		consumidor_final: z.boolean(),
		contribuinte_icms: z.boolean(),
		possibilidade_st: z.boolean(),
		possibilidade_difal: z.boolean(),
		possibilidade_fcp: z.boolean(),
	}),
	decisao: z.object({
		cfop: z.string().nullable(),
		csosn: z.string().nullable(),
		cst: z.string().nullable(),
		st: z.string(),
		difal: z.string(),
		fcp: z.string(),
	}),
	nivel_confianca: z.string(),
	fontes: z.array(
		z.object({
			orgao: z.string().optional(),
			documento: z.string().optional(),
			url: z.string().optional(),
			vigencia: z.string().optional(),
		}),
	),
	regras_aplicadas: z.array(z.string()),
	validacoes: z.array(
		z.object({
			status: z.string(),
			code: z.string(),
			field: z.string().optional(),
			expected: z.union([z.number(), z.string()]).optional(),
			actual: z.union([z.number(), z.string()]).optional(),
			message: z.string(),
		}),
	),
	inconsistencias: z.array(
		z.object({
			tipo: z.string(),
			code: z.string(),
		}),
	),
});

export type RelatorioAuditoriaFiscal = z.infer<
	typeof relatorioAuditoriaFiscalSchema
>;

export function extrairRelatorioFiscalErro(
	erro: unknown,
): RelatorioAuditoriaFiscal | null {
	if (!erro || typeof erro !== "object") return null;
	const relatorio = (erro as { relatorioFiscal?: unknown }).relatorioFiscal;
	const parsed = relatorioAuditoriaFiscalSchema.safeParse(relatorio);
	return parsed.success ? parsed.data : null;
}

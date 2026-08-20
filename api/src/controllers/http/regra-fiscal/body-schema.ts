import z from "zod";

export const statusRegraFiscalSchema = z.enum([
	"rascunho",
	"pendente_revisao",
	"validado",
	"incompativel",
	"desativado",
]);

export const fonteRegraFiscalSchema = z.object({
	tipo: z.string().optional(),
	numero: z.string().optional(),
	url: z.string().optional(),
	orgao: z.string().optional(),
	vigencia_inicio: z.string().optional(),
});

export const condicoesRegraFiscalSchema = z.record(z.string(), z.unknown());
export const resultadoRegraFiscalSchema = z.record(z.string(), z.unknown());

export const criarRegraFiscalBodySchema = z.object({
	ruleid: z.string().min(3).max(80),
	descricao: z.string().min(1),
	prioridade: z.number().int().optional(),
	vigenciainicio: z.string().min(10),
	vigenciafim: z.string().nullable().optional(),
	condicoes: condicoesRegraFiscalSchema,
	resultado: resultadoRegraFiscalSchema,
	fontes: z.array(fonteRegraFiscalSchema).default([]),
	status: statusRegraFiscalSchema.optional(),
	idempresa: z.string().uuid().nullable().optional(),
});

export const atualizarRegraFiscalBodySchema = criarRegraFiscalBodySchema.partial();

export const rollbackRegraFiscalBodySchema = z.object({
	versao: z.number().int().positive(),
});

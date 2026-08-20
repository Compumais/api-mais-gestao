import { z } from "zod";

export const regraFiscalFormSchema = z.object({
	ruleid: z.string().min(3).max(80),
	descricao: z.string().min(1),
	prioridade: z.coerce.number().int(),
	vigenciainicio: z.string().min(10),
	vigenciafim: z.string().optional().nullable(),
	condicoesJson: z.string().min(2),
	resultadoJson: z.string().min(2),
	fontesJson: z.string().min(2),
});

export type RegraFiscalFormData = z.infer<typeof regraFiscalFormSchema>;

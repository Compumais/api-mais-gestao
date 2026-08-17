import { z } from "zod";

export const terminalPdvSchema = z.object({
	numeropdv: z.coerce.number().int().min(1).max(999),
	descricao: z.string().max(120).optional().nullable(),
	idnfeserie: z.string().uuid().nullable().optional(),
	ativo: z.boolean().optional(),
});

export type TerminalPdvFormData = z.infer<typeof terminalPdvSchema>;

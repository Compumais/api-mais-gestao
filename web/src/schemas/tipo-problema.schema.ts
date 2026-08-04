import { z } from "zod";

export const tipoProblemaFormSchema = z.object({
	codigo: z
		.string()
		.max(6, "Código deve ter no máximo 6 caracteres")
		.optional(),
	descricao: z
		.string()
		.min(1, "Descrição é obrigatória")
		.max(50, "Descrição deve ter no máximo 50 caracteres"),
	inativo: z.boolean(),
});

export type TipoProblemaFormData = z.output<typeof tipoProblemaFormSchema>;

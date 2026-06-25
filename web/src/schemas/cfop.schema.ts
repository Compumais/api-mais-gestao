import { z } from "zod";

export const cfopFormSchema = z.object({
	codigo: z
		.string()
		.min(1, "Código é obrigatório")
		.max(20, "Código deve ter no máximo 20 caracteres"),
	descricao: z
		.string()
		.min(1, "Descrição é obrigatória")
		.max(1024, "Descrição deve ter no máximo 1024 caracteres"),
});

export type CfopFormData = z.infer<typeof cfopFormSchema>;

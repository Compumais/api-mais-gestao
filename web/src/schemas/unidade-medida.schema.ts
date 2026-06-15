import { z } from "zod";

export const unidadeMedidaFormSchema = z.object({
	nome: z
		.string()
		.max(50, "Nome deve ter no máximo 50 caracteres")
		.optional(),
	codigo: z
		.string()
		.max(6, "Código deve ter no máximo 6 caracteres")
		.optional(),
});

export type UnidadeMedidaFormData = z.infer<typeof unidadeMedidaFormSchema>;

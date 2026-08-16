import { z } from "zod";

export const grupoGourmetFormSchema = z.object({
	codigo: z
		.string()
		.max(30, "Código deve ter no máximo 30 caracteres")
		.optional(),
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.max(60, "Nome deve ter no máximo 60 caracteres"),
});

export type GrupoGourmetFormData = z.infer<typeof grupoGourmetFormSchema>;

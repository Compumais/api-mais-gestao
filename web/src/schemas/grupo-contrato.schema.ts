import { z } from "zod";

export const grupoContratoFormSchema = z.object({
	codigo: z.coerce
		.number()
		.int("Código deve ser um número inteiro")
		.positive("Código deve ser maior que zero"),
	descricao: z
		.string()
		.trim()
		.min(1, "Descrição é obrigatória")
		.max(120, "Descrição deve ter no máximo 120 caracteres"),
});

export type GrupoContratoFormData = z.output<typeof grupoContratoFormSchema>;

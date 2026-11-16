import { z } from "zod";

export const tipoContratoFormSchema = z.object({
	idgrupocontrato: z.string().min(1, "Selecione o grupo"),
	codigo: z.coerce
		.number()
		.int("Código deve ser um número inteiro")
		.positive("Código deve ser maior que zero"),
	descricao: z
		.string()
		.trim()
		.min(1, "Descrição é obrigatória")
		.max(120, "Descrição deve ter no máximo 120 caracteres"),
	valor: z.coerce.number().positive("Valor deve ser maior que zero"),
});

export type TipoContratoFormData = z.output<typeof tipoContratoFormSchema>;

import { z } from "zod";

export const fatorConversaoFormSchema = z.object({
	nome: z
		.string()
		.min(1, "Informe o nome")
		.max(100, "Nome deve ter no máximo 100 caracteres"),
	fator: z
		.string()
		.min(1, "Informe o fator")
		.refine((valor) => {
			const numero = Number.parseFloat(valor.replace(",", "."));
			return !Number.isNaN(numero) && numero > 0;
		}, "Fator deve ser maior que zero"),
});

export type FatorConversaoFormData = z.infer<typeof fatorConversaoFormSchema>;

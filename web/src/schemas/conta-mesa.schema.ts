import { z } from "zod";

export const abrirMesaSchema = z.object({
	numeromesa: z
		.number({ message: "Informe o número da mesa" })
		.int("Número da mesa deve ser inteiro")
		.min(1, "Número da mesa deve ser maior que zero"),
	numeropessoas: z
		.number()
		.int()
		.min(1, "Número de pessoas deve ser maior que zero")
		.optional(),
	observacao: z.string().max(500).optional(),
});

export type AbrirMesaFormData = z.infer<typeof abrirMesaSchema>;

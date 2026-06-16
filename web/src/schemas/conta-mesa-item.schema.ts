import { z } from "zod";

export const adicionarItemSchema = z.object({
	quantidade: z.coerce
		.number({ message: "Informe a quantidade" })
		.min(0.001, "Quantidade deve ser maior que zero"),
	observacao: z.string().max(200).optional(),
});

export type AdicionarItemFormData = z.infer<typeof adicionarItemSchema>;

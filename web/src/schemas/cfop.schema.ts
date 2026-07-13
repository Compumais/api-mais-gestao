import { z } from "zod";
import { TIPOS_PRODUTO_SPED } from "@/constants/tipo-produto";

const codigosTipoProduto = TIPOS_PRODUTO_SPED.map((item) => item.codigo) as [
	string,
	...string[],
];

export const cfopFormSchema = z.object({
	codigo: z
		.string()
		.min(1, "Código é obrigatório")
		.max(20, "Código deve ter no máximo 20 caracteres"),
	descricao: z
		.string()
		.min(1, "Descrição é obrigatória")
		.max(1024, "Descrição deve ter no máximo 1024 caracteres"),
	tipoproduto: z
		.enum(codigosTipoProduto, {
			message: "Tipo de produto inválido",
		})
		.optional()
		.nullable(),
});

export type CfopFormData = z.infer<typeof cfopFormSchema>;

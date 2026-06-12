import { z } from "zod";

export const produtoFormSchema = z.object({
	codigo: z
		.number({ message: "Código é obrigatório" })
		.int("Código deve ser um número inteiro")
		.positive("Código deve ser maior que zero"),
	ean: z
		.number()
		.int("Código de barras deve ser um número inteiro")
		.optional()
		.nullable(),
	referencia: z
		.string()
		.max(60, "Referência deve ter no máximo 60 caracteres")
		.optional()
		.nullable(),
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.max(120, "Nome deve ter no máximo 120 caracteres"),
	idunidademedida: z.string().min(1, "Unidade é obrigatória"),
	fornecedor: z.string().optional().nullable(),
	idgrupo: z.string().min(1, "Grupo é obrigatório"),
	preco: z
		.string()
		.min(1, "Preço é obrigatório")
		.refine((valor) => {
			const numero = Number.parseFloat(valor);
			return !Number.isNaN(numero) && numero > 0;
		}, "Preço deve ser maior que zero"),
	tipo: z.enum(["P", "S"], { message: "Tipo de produto inválido" }),
	iat: z.enum(["A", "T"]).optional().nullable(),
	ippt: z.enum(["P", "T"], { message: "IPPT é obrigatório" }),
	origem: z
		.number()
		.int()
		.min(0, "Origem inválida")
		.max(2, "Origem inválida"),
	ncm: z
		.string()
		.min(1, "NCM é obrigatório")
		.max(10, "NCM deve ter no máximo 10 caracteres"),
	observacoes: z.string().optional().nullable(),
});

export type ProdutoFormData = z.infer<typeof produtoFormSchema>;

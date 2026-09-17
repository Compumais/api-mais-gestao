import { z } from "zod";

export const pedidoCompraItemSchema = z.object({
	idproduto: z.string().min(1, "Selecione um produto do cadastro"),
	descricao: z.string().optional(),
	nomeproduto: z.string().optional(),
	codigoproduto: z.number().nullable().optional(),
	quantidade: z.string().min(1, "Quantidade é obrigatória"),
	precounitario: z.string().min(1, "Preço é obrigatório"),
	total: z.string().optional(),
});

export const pedidoCompraFormSchema = z.object({
	identidade: z.string().min(1, "Selecione o fornecedor"),
	fornecedortelefone: z
		.string()
		.trim()
		.min(1, "Informe o telefone do fornecedor")
		.max(20),
	observacao: z.string().optional().nullable(),
	comoCotacao: z.boolean(),
	tituloCotacao: z.string().max(120).optional().nullable(),
	validade: z.string().optional().nullable(),
	itens: z
		.array(pedidoCompraItemSchema)
		.min(1, "Inclua ao menos um produto"),
});

export type PedidoCompraFormData = z.infer<typeof pedidoCompraFormSchema>;
export type PedidoCompraItemFormData = z.infer<typeof pedidoCompraItemSchema>;

import { z } from "zod";

export const cotacaoCompraItemSchema = z
	.object({
		idproduto: z.string().nullable().optional(),
		descricao: z.string().max(120).nullable().optional(),
		quantidade: z.string().min(1, "Quantidade é obrigatória"),
		unidademedida: z.string().nullable().optional(),
		observacao: z.string().nullable().optional(),
		nomeproduto: z.string().optional(),
		codigoproduto: z.number().nullable().optional(),
	})
	.superRefine((item, ctx) => {
		const temProduto = Boolean(item.idproduto);
		const nome = (item.descricao || item.nomeproduto || "").trim();
		if (!temProduto && nome.length < 2) {
			ctx.addIssue({
				code: "custom",
				message: "Informe o produto ou o nome do item",
				path: ["idproduto"],
			});
		}
	});

export const cotacaoCompraFormSchema = z.object({
	titulo: z.string().min(1, "Título é obrigatório").max(120),
	observacao: z.string().optional().nullable(),
	validade: z.string().optional().nullable(),
	itens: z
		.array(cotacaoCompraItemSchema)
		.min(1, "Inclua ao menos um produto"),
});

export type CotacaoCompraFormData = z.infer<typeof cotacaoCompraFormSchema>;

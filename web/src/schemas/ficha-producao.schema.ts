import { z } from "zod";

const itemSchema = z.object({
	idproduto: z.string().uuid("Selecione o componente"),
	quantidade: z
		.string()
		.min(1, "Informe a quantidade")
		.refine((valor) => {
			const n = Number.parseFloat(valor.replace(",", "."));
			return !Number.isNaN(n) && n > 0;
		}, "Quantidade deve ser maior que zero"),
	ordem: z.number().int().optional(),
});

export const fichaProducaoFormSchema = z
	.object({
		idprodutoacabado: z.string().uuid("Selecione o produto acabado"),
		permiteproducaomassa: z.boolean(),
		producaonavenda: z.boolean(),
		observacao: z.string().optional().nullable(),
		ativo: z.boolean().optional(),
		itens: z.array(itemSchema).min(1, "Informe ao menos um componente"),
	})
	.refine(
		(data) => data.permiteproducaomassa || data.producaonavenda,
		{
			message:
				"Marque ao menos uma opção: produzir em massa ou produzir na venda",
			path: ["permiteproducaomassa"],
		},
	)
	.refine(
		(data) =>
			!data.itens.some((item) => item.idproduto === data.idprodutoacabado),
		{
			message: "O componente não pode ser o próprio produto acabado",
			path: ["itens"],
		},
	);

export type FichaProducaoFormData = z.infer<typeof fichaProducaoFormSchema>;

export const produzirFichaSchema = z.object({
	quantidade: z
		.string()
		.min(1, "Informe a quantidade")
		.refine((valor) => {
			const n = Number.parseFloat(valor.replace(",", "."));
			return !Number.isNaN(n) && n > 0;
		}, "Quantidade deve ser maior que zero"),
});

export type ProduzirFichaFormData = z.infer<typeof produzirFichaSchema>;

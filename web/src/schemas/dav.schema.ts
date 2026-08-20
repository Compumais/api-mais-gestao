import { z } from "zod";

const idOpcional = z.preprocess(
	(valor) => (valor === "" || valor === undefined ? undefined : valor),
	z.string().uuid().optional(),
);

export const pedidoDavItemLocalSchema = z.object({
	idproduto: z.string().uuid(),
	quantidade: z.string().min(1),
	preco: z.string().min(1),
	unidademedida: z.string().optional(),
});

export const salvarNovoPedidoDavSchema = z
	.object({
		idcliente: idOpcional,
		itens: z.array(pedidoDavItemLocalSchema),
	})
	.superRefine((dados, ctx) => {
		const temCliente = Boolean(dados.idcliente);
		const temItens = dados.itens.length > 0;
		if (!temCliente && !temItens) {
			ctx.addIssue({
				code: "custom",
				message:
					"Informe o cliente ou adicione ao menos um item para salvar o pedido.",
				path: ["idcliente"],
			});
		}
	});

export type PedidoDavItemLocal = z.infer<typeof pedidoDavItemLocalSchema>;

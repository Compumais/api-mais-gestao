import { z } from "zod";
import {
	COLUNAS_BLOCO_MODELO_IMPRESSAO,
	colunaBlocoModeloImpressaoSchema,
} from "@/schemas/modelo-impressao-os.schema";

export const TIPOS_BLOCO_MODELO_IMPRESSAO_PEDIDO = [
	"cabecalhoEmpresa",
	"titulo",
	"textoLivre",
	"dadosPedido",
	"cliente",
	"observacao",
	"itens",
	"totais",
	"assinaturas",
	"rodape",
] as const;

export { COLUNAS_BLOCO_MODELO_IMPRESSAO };

export const tipoBlocoModeloImpressaoPedidoSchema = z.enum(
	TIPOS_BLOCO_MODELO_IMPRESSAO_PEDIDO,
);

export const blocoModeloImpressaoPedidoSchema = z.object({
	id: z.string().min(1),
	tipo: tipoBlocoModeloImpressaoPedidoSchema,
	coluna: colunaBlocoModeloImpressaoSchema.optional(),
	props: z
		.object({
			titulo: z.string().max(200).optional(),
			texto: z.string().max(5000).optional(),
			campos: z.array(z.string()).optional(),
		})
		.optional(),
});

export const modeloImpressaoPedidoFormSchema = z.object({
	nome: z.string().min(1, "Nome obrigatório").max(120),
	descricao: z.string().max(255).optional().nullable(),
	layout: z.array(blocoModeloImpressaoPedidoSchema),
	primario: z.boolean().default(false),
});

export type TipoBlocoModeloImpressaoPedido = z.infer<
	typeof tipoBlocoModeloImpressaoPedidoSchema
>;
export type BlocoModeloImpressaoPedido = z.infer<
	typeof blocoModeloImpressaoPedidoSchema
>;
export type LayoutModeloImpressaoPedido = BlocoModeloImpressaoPedido[];
export type ModeloImpressaoPedidoFormData = z.infer<
	typeof modeloImpressaoPedidoFormSchema
>;

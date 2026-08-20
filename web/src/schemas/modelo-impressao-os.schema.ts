import { z } from "zod";

export const TIPOS_BLOCO_MODELO_IMPRESSAO_OS = [
	"cabecalhoEmpresa",
	"titulo",
	"textoLivre",
	"dadosOs",
	"cliente",
	"veiculo",
	"problema",
	"laudo",
	"observacao",
	"itens",
	"totais",
	"extras",
	"assinaturas",
	"rodape",
] as const;

export const tipoBlocoModeloImpressaoOsSchema = z.enum(
	TIPOS_BLOCO_MODELO_IMPRESSAO_OS,
);

export const blocoModeloImpressaoOsSchema = z.object({
	id: z.string().min(1),
	tipo: tipoBlocoModeloImpressaoOsSchema,
	props: z
		.object({
			titulo: z.string().max(200).optional(),
			texto: z.string().max(5000).optional(),
			campos: z.array(z.string()).optional(),
		})
		.optional(),
});

export const modeloImpressaoOsFormSchema = z.object({
	nome: z.string().min(1, "Nome obrigatório").max(120),
	descricao: z.string().max(255).optional().nullable(),
	layout: z.array(blocoModeloImpressaoOsSchema),
	primario: z.boolean().default(false),
});

export type TipoBlocoModeloImpressaoOs = z.infer<
	typeof tipoBlocoModeloImpressaoOsSchema
>;
export type BlocoModeloImpressaoOs = z.infer<typeof blocoModeloImpressaoOsSchema>;
export type LayoutModeloImpressaoOs = BlocoModeloImpressaoOs[];
export type ModeloImpressaoOsFormData = z.infer<typeof modeloImpressaoOsFormSchema>;

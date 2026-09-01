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
	"servicoRealizado",
	"observacao",
	"itens",
	"totais",
	"extras",
	"personalizado",
	"assinaturas",
	"rodape",
] as const;

export const COLUNAS_BLOCO_MODELO_IMPRESSAO = [
	"cheia",
	"esquerda",
	"direita",
] as const;

export const tipoBlocoModeloImpressaoOsSchema = z.enum(
	TIPOS_BLOCO_MODELO_IMPRESSAO_OS,
);

export const colunaBlocoModeloImpressaoSchema = z.enum(
	COLUNAS_BLOCO_MODELO_IMPRESSAO,
);

export const TIPOS_CAMPO_PERSONALIZADO_OS = [
	"assinatura",
	"data",
	"observacao",
	"textoFixo",
	"status",
] as const;

export const tipoCampoPersonalizadoOsSchema = z.enum(
	TIPOS_CAMPO_PERSONALIZADO_OS,
);

export const campoPersonalizadoOsSchema = z.object({
	id: z.string().min(1),
	tipo: tipoCampoPersonalizadoOsSchema,
	rotulo: z.string().max(120),
	valor: z.string().max(5000).optional(),
	coluna: colunaBlocoModeloImpressaoSchema.default("cheia"),
});

export const blocoModeloImpressaoOsSchema = z.object({
	id: z.string().min(1),
	tipo: tipoBlocoModeloImpressaoOsSchema,
	coluna: colunaBlocoModeloImpressaoSchema.optional(),
	props: z
		.object({
			titulo: z.string().max(200).optional(),
			texto: z.string().max(5000).optional(),
			campos: z.array(z.string()).optional(),
			mostrarResponsavel: z.boolean().optional(),
			tituloSecao: z.string().max(200).optional(),
			camposPersonalizados: z.array(campoPersonalizadoOsSchema).optional(),
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
export type ColunaBlocoModeloImpressao = z.infer<
	typeof colunaBlocoModeloImpressaoSchema
>;
export type TipoCampoPersonalizadoOs = z.infer<
	typeof tipoCampoPersonalizadoOsSchema
>;
export type CampoPersonalizadoOs = z.infer<typeof campoPersonalizadoOsSchema>;
export type BlocoModeloImpressaoOs = z.infer<typeof blocoModeloImpressaoOsSchema>;
export type LayoutModeloImpressaoOs = BlocoModeloImpressaoOs[];
export type ModeloImpressaoOsFormData = z.infer<typeof modeloImpressaoOsFormSchema>;

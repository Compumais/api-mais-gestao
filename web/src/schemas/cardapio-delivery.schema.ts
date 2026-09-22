import { z } from "zod";

const campoSchema = z.object({
	id: z.string().min(1),
	tipo: z.enum([
		"modalidade",
		"endereco",
		"pagamento",
		"documento",
		"observacao",
		"texto",
		"select",
	]),
	rotulo: z.string().min(1, "Informe o rótulo").max(80),
	obrigatorio: z.number().int().min(0).max(1),
	ordem: z.number().int().min(0),
	opcoes: z.array(z.string()).optional(),
	condicao: z
		.object({
			campoid: z.string(),
			valor: z.string(),
		})
		.nullable()
		.optional(),
});

export const cardapioDeliveryFormSchema = z.object({
	slug: z
		.string()
		.min(2, "Slug muito curto")
		.max(80)
		.regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
	ativo: z.boolean(),
	corprimaria: z.string().min(4).max(16),
	habilitadelivery: z.boolean(),
	habilitaretirada: z.boolean(),
	taxaentregapadrao: z.string(),
	bairrosentrega: z.array(
		z.object({
			nome: z.string().min(1),
			taxa: z.number().min(0),
		}),
	),
	pedidominimo: z.string(),
	chavepix: z.string().max(120).optional().nullable(),
	tempomedioentrega: z.string().max(60).optional().nullable(),
	mensagemrodape: z.string().max(500).optional().nullable(),
	horario: z.object({
		ativo: z.boolean(),
		modo: z.enum(["simples", "semanal"]),
		timezone: z.string(),
		inicio: z.string().nullable(),
		fim: z.string().nullable(),
		semanal: z.record(
			z.string(),
			z
				.object({
					ativo: z.boolean(),
					inicio: z.string(),
					fim: z.string(),
				})
				.optional(),
		),
		datasfechadas: z.array(z.string()),
		mensagem: z.string().nullable(),
	}),
	camposfinalizacao: z.array(campoSchema),
	idmeiospagamento: z.array(z.string()),
});

export type CardapioDeliveryFormData = z.infer<
	typeof cardapioDeliveryFormSchema
>;

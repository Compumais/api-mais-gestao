import { z } from "zod";

const IMAGEM_MAX_LENGTH = 700_000;
export const AJUDA_IMAGEM_MAX_BYTES = 500 * 1024;

const imagemDataUrlSchema = z
	.string()
	.refine(
		(valor) =>
			valor.startsWith("data:image/") && valor.length <= IMAGEM_MAX_LENGTH,
		{
			message:
				"Imagem inválida ou muito grande. Use uma imagem de até 500 KB.",
		},
	);

export const ajudaPostFormSchema = z.object({
	titulo: z.string().min(1, "Título é obrigatório").max(200),
	subtitulo: z.string().max(300).optional().or(z.literal("")),
	descricao: z.string().min(1, "Descrição é obrigatória"),
	capa: z.union([imagemDataUrlSchema, z.literal(""), z.null()]).optional(),
	imagens: z.array(imagemDataUrlSchema).max(10).optional(),
	publicado: z.boolean().optional(),
});

export type AjudaPostFormData = z.infer<typeof ajudaPostFormSchema>;

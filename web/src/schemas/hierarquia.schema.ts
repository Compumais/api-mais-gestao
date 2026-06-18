import { z } from "zod";

const ICONE_MAX_LENGTH = 700_000;
const FOTO_MAX_BYTES = 500 * 1024;

export const hierarquiaFormSchema = z.object({
	codigo: z
		.string()
		.max(30, "Código deve ter no máximo 30 caracteres")
		.optional(),
	nome: z
		.string()
		.max(40, "Nome deve ter no máximo 40 caracteres")
		.optional(),
	ncm: z
		.string()
		.max(10, "NCM deve ter no máximo 10 caracteres")
		.optional(),
	classe: z.enum(["0", "1", "2", "3"]).optional(),
	origem: z.enum(["0", "1", "2"]).optional(),
	comissao: z
		.string()
		.optional()
		.refine(
			(valor) => {
				if (!valor || valor.trim() === "") return true;
				const numero = Number.parseFloat(valor.replace(",", "."));
				return !Number.isNaN(numero) && numero >= 0 && numero <= 100;
			},
			{ message: "Comissão deve ser um percentual entre 0 e 100" },
		),
	enviamobile: z.boolean().optional(),
	icone: z
		.string()
		.nullable()
		.optional()
		.refine(
			(valor) => {
				if (valor == null || valor === "") return true;
				return (
					valor.startsWith("data:image/") && valor.length <= ICONE_MAX_LENGTH
				);
			},
			{
				message:
					"Foto inválida ou muito grande. Use uma imagem de até 500 KB.",
			},
		),
});

export const FOTO_GRUPO_MAX_BYTES = FOTO_MAX_BYTES;

export type HierarquiaFormData = z.infer<typeof hierarquiaFormSchema>;

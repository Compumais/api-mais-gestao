import z from "zod";

const ICONE_MAX_LENGTH = 700_000;

export const hierarquiaIconeSchema = z
	.union([
		z
			.string()
			.max(ICONE_MAX_LENGTH, "Foto do grupo excede o tamanho máximo permitido")
			.refine((valor) => valor.startsWith("data:image/"), {
				message: "Foto do grupo deve ser uma imagem em base64 (data:image/...)",
			}),
		z.null(),
	])
	.optional();

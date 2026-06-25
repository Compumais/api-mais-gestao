import { z } from "zod";
import { UFS_BRASIL } from "@/util/ufs-brasil.js";

const campoNumericoOpcional = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((valor) => {
		if (valor === null || valor === undefined || valor === "") return null;
		return String(valor).replace(",", ".");
	});

const camposUfSchema = Object.fromEntries(
	UFS_BRASIL.map((uf) => [`uf_${uf.toLowerCase()}`, campoNumericoOpcional]),
) as Record<string, typeof campoNumericoOpcional>;

export const taxaUfBodySchema = z.object({
	idempresa: z.string(),
	codigo: z.string().trim().min(1).max(4),
	descricao: z.string().trim().min(1),
	baseicms: campoNumericoOpcional,
	baseicmsfe: campoNumericoOpcional,
	baseicmsst: campoNumericoOpcional,
	baseiss: campoNumericoOpcional,
	iss: campoNumericoOpcional,
	pordif: campoNumericoOpcional,
	bcporuf: z.enum(["S", "N"]).optional().nullable(),
	inativo: z.number().int().optional(),
	...camposUfSchema,
});

export const taxaUfAtualizacaoBodySchema = taxaUfBodySchema
	.omit({ idempresa: true })
	.partial()
	.extend({
		idempresa: z.string().optional(),
	});

export type TaxaUfBody = z.infer<typeof taxaUfBodySchema>;

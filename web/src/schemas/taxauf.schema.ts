import { z } from "zod";
import { UFS_BRASIL } from "@/util/ufs-brasil";

const campoNumericoOpcional = z
	.string()
	.optional()
	.nullable()
	.refine(
		(valor) => {
			if (!valor || valor.trim() === "") return true;
			const numero = Number.parseFloat(valor.replace(",", "."));
			return !Number.isNaN(numero);
		},
		{ message: "Informe um valor numérico válido" },
	);

const camposUf = Object.fromEntries(
	UFS_BRASIL.map((uf) => [`uf_${uf.toLowerCase()}`, campoNumericoOpcional]),
);

export const taxaUfFormSchema = z.object({
	codigo: z
		.string()
		.min(1, "Código é obrigatório")
		.max(4, "Código deve ter no máximo 4 caracteres"),
	descricao: z.string().min(1, "Descrição é obrigatória"),
	baseicms: campoNumericoOpcional,
	baseicmsfe: campoNumericoOpcional,
	baseicmsst: campoNumericoOpcional,
	baseiss: campoNumericoOpcional,
	iss: campoNumericoOpcional,
	pordif: campoNumericoOpcional,
	bcporuf: z.enum(["S", "N"]).optional().nullable(),
	inativo: z.number().int().optional(),
	...camposUf,
});

export type TaxaUfFormData = z.infer<typeof taxaUfFormSchema>;

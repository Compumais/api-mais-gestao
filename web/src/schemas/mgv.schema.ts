import { z } from "zod";

export const exportarMgvSchema = z.object({
	departamentoPadrao: z.coerce
		.number()
		.int()
		.min(1, "Departamento mínimo é 1")
		.max(99, "Departamento máximo é 99"),
	diasValidade: z.coerce
		.number()
		.int()
		.refine(
			(valor) => (valor >= 0 && valor <= 990) || valor === 998 || valor === 999,
			"Use 0 a 990, 998 (não imprime datas) ou 999 (solicita na balança)",
		),
	apenasPesaveis: z.boolean(),
});

export type ExportarMgvFormData = z.infer<typeof exportarMgvSchema>;

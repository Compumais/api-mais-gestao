import { z } from "zod";

const tipogestaoSchema = z.enum(["ADM", "COM", "OPE", "PRJ", "OUT"]).nullable();

export const criarCentroCustoSchema = z.object({
	idempresa: z.string().min(1, "Empresa é obrigatória"),
	nome: z.string().min(1, "Nome é obrigatório").max(50, "Máximo 50 caracteres"),
	descricao: z.string().nullable().optional(),
	tipogestao: tipogestaoSchema.optional(),
	iddepartamento: z.string().nullable().optional(),
	inativo: z.coerce
		.number()
		.int()
		.min(0)
		.max(1)
		.default(0),
	idcentrocustopai: z.string().optional(),
	codigoextenso: z.string().max(85).optional(),
	codigoreduzido: z.string().max(20).optional(),
	observacao: z.string().nullable().optional(),
});

export const atualizarCentroCustoSchema = criarCentroCustoSchema.omit({
	idempresa: true,
});

export const linhaApropriacaoCentroCustoSchema = z.object({
	idcentrocusto: z.string().min(1, "Centro de custo é obrigatório"),
	valor: z.coerce.number().optional(),
	percentual: z.coerce.number().min(0).max(100).optional().nullable(),
});

export const apropriacaoCentroCustoFormSchema = z
	.object({
		modo: z.enum(["unico", "rateio_manual", "rateio_criterio"]),
		idcriteriorateio: z.string().nullable().optional(),
		linhas: z.array(linhaApropriacaoCentroCustoSchema),
	})
	.superRefine((data, ctx) => {
		if (data.modo === "rateio_criterio") {
			if (!data.idcriteriorateio) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Selecione um critério de rateio",
					path: ["idcriteriorateio"],
				});
			}
			return;
		}
		if (data.linhas.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Informe ao menos uma linha de apropriação",
				path: ["linhas"],
			});
		}
		if (data.modo === "unico" && data.linhas.length !== 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Modo único exige um centro de custo",
				path: ["linhas"],
			});
		}
	});

const budgetCentroCustoBaseSchema = z.object({
	idcentrocusto: z.string().min(1, "Centro de custo é obrigatório"),
	idplanocontas: z.string().optional().nullable(),
	ano: z.coerce.number().int().min(2000).max(2100),
	periodicidade: z.enum(["M", "A"]),
	mes: z.coerce.number().int().min(1).max(12).optional().nullable(),
	valor: z.coerce.number().positive("Valor deve ser maior que zero"),
});

function validarMesBudget(data: {
	periodicidade: "M" | "A";
	mes?: number | null;
}) {
	return data.periodicidade === "A" || !!data.mes;
}

export const criarBudgetCentroCustoSchema = budgetCentroCustoBaseSchema.refine(
	validarMesBudget,
	{
		message: "Mês é obrigatório para orçamento mensal",
		path: ["mes"],
	},
);

export type CriarCentroCustoFormData = z.infer<typeof criarCentroCustoSchema>;
export type AtualizarCentroCustoFormData = z.infer<
	typeof atualizarCentroCustoSchema
>;
export type ApropriacaoCentroCustoFormData = z.infer<
	typeof apropriacaoCentroCustoFormSchema
>;
export type CriarBudgetCentroCustoFormData = z.infer<
	typeof criarBudgetCentroCustoSchema
>;

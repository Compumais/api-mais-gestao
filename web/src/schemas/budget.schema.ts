import { z } from "zod";

const budgetBaseSchema = z.object({
	idplanocontas: z.string().min(1, "Plano de contas é obrigatório"),
	ano: z.coerce
		.number("Ano inválido")
		.int("Ano inválido")
		.min(2000, "Ano inválido")
		.max(2100, "Ano inválido"),
	periodicidade: z.enum(["M", "A"], "Periodicidade é obrigatória"),
	mes: z.coerce.number().int().min(1).max(12).optional().nullable(),
	valor: z.coerce
		.number("Valor inválido")
		.positive("Valor deve ser maior que zero"),
});

function validarMes(data: {
	periodicidade: "M" | "A";
	mes?: number | null | undefined;
}) {
	return data.periodicidade === "A" || !!data.mes;
}

export const criarBudgetSchema = budgetBaseSchema.refine(validarMes, {
	message: "Mês é obrigatório para budget mensal",
	path: ["mes"],
});

export const atualizarBudgetSchema = budgetBaseSchema.refine(validarMes, {
	message: "Mês é obrigatório para budget mensal",
	path: ["mes"],
});

export type CriarBudgetFormData = z.infer<typeof criarBudgetSchema>;
export type AtualizarBudgetFormData = z.infer<typeof atualizarBudgetSchema>;

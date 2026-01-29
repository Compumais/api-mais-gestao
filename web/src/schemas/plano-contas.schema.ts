import { z } from "zod";

export const criarPlanoContasSchema = z.object({
	idempresa: z.uuid("ID da empresa inválido"),
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.min(3, "Nome deve ter no mínimo 3 caracteres"),
	tipomovimento: z.enum(["E", "S"]),
	inativo: z.number().int().min(0).max(1),
	idplanocontas: z
		.uuid("ID do plano de contas pai inválido")
		.nullable()
		.optional(),
});

export type CriarPlanoContasFormData = z.infer<typeof criarPlanoContasSchema>;

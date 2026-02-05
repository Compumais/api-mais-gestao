import { z } from "zod";

export const criarBancoSchema = z.object({
	idempresa: z.uuid("ID da empresa inválido"),
	codigo: z
		.string()
		.min(1, "Código é obrigatório")
		.max(6, "Código deve ter no máximo 6 caracteres"),
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.min(3, "Nome deve ter no mínimo 3 caracteres")
		.max(60, "Nome deve ter no máximo 60 caracteres"),
});

export const atualizarBancoSchema = z.object({
	codigo: z
		.string()
		.min(1, "Código é obrigatório")
		.max(6, "Código deve ter no máximo 6 caracteres")
		.optional(),
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.min(3, "Nome deve ter no mínimo 3 caracteres")
		.max(60, "Nome deve ter no máximo 60 caracteres")
		.optional(),
});

export type CriarBancoFormData = z.infer<typeof criarBancoSchema>;
export type AtualizarBancoFormData = z.infer<typeof atualizarBancoSchema>;

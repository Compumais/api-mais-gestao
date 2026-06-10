import { z } from "zod";

export const criarUsuarioSchema = z.object({
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.min(3, "Nome deve ter no mínimo 3 caracteres")
		.max(100, "Nome deve ter no máximo 100 caracteres"),
	email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
	password: z
		.string()
		.min(6, "Senha deve ter no mínimo 6 caracteres")
		.max(100, "Senha deve ter no máximo 100 caracteres"),
	perfil: z.string().min(1, "Perfil é obrigatório"),
	empresasIds: z.array(z.string().uuid()).optional(),
	idempresa: z.string().uuid("ID da empresa inválido"),
});

export const atualizarUsuarioSchema = z.object({
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.min(3, "Nome deve ter no mínimo 3 caracteres")
		.max(100, "Nome deve ter no máximo 100 caracteres")
		.optional(),
	perfil: z.string().min(1, "Perfil é obrigatório").optional(),
	empresasIds: z.array(z.string().uuid()).optional(),
	idempresa: z.string().uuid("ID da empresa inválido"),
});

export type CriarUsuarioFormData = z.infer<typeof criarUsuarioSchema>;
export type AtualizarUsuarioFormData = z.infer<typeof atualizarUsuarioSchema>;

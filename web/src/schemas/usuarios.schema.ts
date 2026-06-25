import { z } from "zod";

export const PERFIS_USUARIO = [
	"usuario",
	"admin",
	"proprietario",
	"garcom",
	"super",
] as const;

export const perfilUsuarioSchema = z.enum(PERFIS_USUARIO);

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
	perfil: perfilUsuarioSchema,
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
	perfil: perfilUsuarioSchema.optional(),
	empresasIds: z.array(z.string().uuid()).optional(),
	idempresa: z.string().uuid("ID da empresa inválido"),
});

export type CriarUsuarioFormData = z.infer<typeof criarUsuarioSchema>;
export type AtualizarUsuarioFormData = z.infer<typeof atualizarUsuarioSchema>;

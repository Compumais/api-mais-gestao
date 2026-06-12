import { z } from "zod";

export const criarEntidadeSchema = z.object({
	idempresa: z.uuid("ID da empresa inválido"),
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.min(3, "Nome deve ter no mínimo 3 caracteres")
		.max(60, "Nome deve ter no máximo 60 caracteres"),
	razaosocial: z
		.string()
		.max(60, "Razão social deve ter no máximo 60 caracteres")
		.nullable()
		.optional(),
	tipopessoa: z.number().int().min(0).max(1).nullable().optional(),
	cnpjcpf: z
		.string()
		.min(1, "CNPJ/CPF é obrigatório")
		.max(20, "CNPJ/CPF deve ter no máximo 20 caracteres"),
	inscricaoestadual: z
		.string()
		.max(20, "Inscrição estadual deve ter no máximo 20 caracteres")
		.nullable()
		.optional(),
	rg: z
		.string()
		.max(20, "RG deve ter no máximo 20 caracteres")
		.nullable()
		.optional(),
	email: z
		.union([
			z
				.string()
				.email("Email inválido")
				.max(200, "Email deve ter no máximo 200 caracteres"),
			z.literal(""),
			z.null(),
		])
		.nullable(),
	telefone: z
		.string()
		.max(40, "Telefone deve ter no máximo 40 caracteres")
		.nullable()
		.optional(),
	endereco: z
		.string()
		.max(60, "Endereço deve ter no máximo 60 caracteres")
		.nullable()
		.optional(),
	numeroendereco: z
		.string()
		.max(6, "Número do endereço deve ter no máximo 6 caracteres")
		.nullable()
		.optional(),
	complemento: z
		.string()
		.max(50, "Complemento deve ter no máximo 50 caracteres")
		.nullable()
		.optional(),
	bairro: z
		.string()
		.max(50, "Bairro deve ter no máximo 50 caracteres")
		.nullable()
		.optional(),
	idcidade: z.string().nullable().optional(),
	idestado: z.string().nullable().optional(),
	cep: z
		.string()
		.max(8, "CEP deve ter no máximo 6 caracteres")
		.nullable()
		.optional(),
	fax: z
		.string()
		.max(40, "Fax deve ter no máximo 40 caracteres")
		.nullable()
		.optional(),
	nascimento: z.string().nullable().optional(),
	idplanocontas: z.string().nullable().optional(),
	pais: z.string().nullable().optional(),
});

export type CriarEntidadeFormData = z.infer<typeof criarEntidadeSchema>;

import { z } from "zod";

const camposCobranca = {
	carteira: z.string().max(6).optional().nullable(),
	codigocedente: z.string().max(20).optional().nullable(),
	codigocedentedv: z.string().max(1).optional().nullable(),
	agenciadv: z.string().max(1).optional().nullable(),
	contadv: z.string().max(2).optional().nullable(),
	layoutarquivoremessa: z.string().max(100).optional().nullable(),
	nossonumeroseq: z.number().int().nonnegative().optional().nullable(),
	sequenciaremessa: z.number().int().nonnegative().optional().nullable(),
};

export const criarContaCorrenteSchema = z.object({
	idempresa: z.string().min(1, "ID da empresa é obrigatório"),
	descricao: z
		.string()
		.max(50, "Descrição deve ter no máximo 50 caracteres")
		.optional(),
	agencia: z
		.string()
		.max(25, "Agência deve ter no máximo 25 caracteres")
		.optional(),
	numeroconta: z
		.string()
		.max(40, "Número da conta deve ter no máximo 40 caracteres")
		.optional(),
	abertura: z.string().optional(),
	observacao: z
		.string()
		.max(150, "Observação deve ter no máximo 150 caracteres")
		.optional(),
	nometitular: z
		.string()
		.max(20, "Nome do titular deve ter no máximo 20 caracteres")
		.optional(),
	cnpjcpftitular: z
		.string()
		.max(20, "CNPJ/CPF do titular deve ter no máximo 20 caracteres")
		.optional(),
	gerente: z
		.string()
		.max(40, "Gerente deve ter no máximo 40 caracteres")
		.optional(),
	telefonegerente: z
		.string()
		.max(20, "Telefone do gerente deve ter no máximo 20 caracteres")
		.optional(),
	codigo: z
		.number()
		.int()
		.positive("Código deve ser um número positivo")
		.optional(),
	idbanco: z.string().uuid("ID do banco deve ser um UUID válido").optional(),
	...camposCobranca,
});

export const atualizarContaCorrenteSchema = z.object({
	descricao: z
		.string()
		.max(50, "Descrição deve ter no máximo 50 caracteres")
		.optional(),
	agencia: z
		.string()
		.max(25, "Agência deve ter no máximo 25 caracteres")
		.optional(),
	numeroconta: z
		.string()
		.max(40, "Número da conta deve ter no máximo 40 caracteres")
		.optional(),
	abertura: z.string().optional(),
	observacao: z
		.string()
		.max(150, "Observação deve ter no máximo 150 caracteres")
		.optional(),
	nometitular: z
		.string()
		.max(20, "Nome do titular deve ter no máximo 20 caracteres")
		.optional(),
	cnpjcpftitular: z
		.string()
		.max(20, "CNPJ/CPF do titular deve ter no máximo 20 caracteres")
		.optional(),
	gerente: z
		.string()
		.max(40, "Gerente deve ter no máximo 40 caracteres")
		.optional(),
	telefonegerente: z
		.string()
		.max(20, "Telefone do gerente deve ter no máximo 20 caracteres")
		.optional(),
	codigo: z
		.number()
		.int()
		.positive("Código deve ser um número positivo")
		.optional(),
	idbanco: z
		.string()
		.uuid("ID do banco deve ser um UUID válido")
		.optional()
		.nullable(),
	...camposCobranca,
});

export type CriarContaCorrenteFormData = z.infer<
	typeof criarContaCorrenteSchema
>;
export type AtualizarContaCorrenteFormData = z.infer<
	typeof atualizarContaCorrenteSchema
>;

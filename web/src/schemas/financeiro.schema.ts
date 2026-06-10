import { z } from "zod";

// Tipos de documento disponíveis
export const TIPO_DOCUMENTO_OPTIONS = [
	"Cartão crédito",
	"Cartão débito",
	"Cheque",
	"Cheque 3o",
	"Cheque a vista",
	"Crediario",
	"Duplicata",
	"Duplicata 3o",
] as const;

export type TipoDocumento = (typeof TIPO_DOCUMENTO_OPTIONS)[number];

// Tipos de documento que requerem campos de cheque
const TIPOS_DOCUMENTO_CHEQUE = [
	"Cheque",
	"Cheque 3o",
	"Cheque a vista",
] as const;

// Tipos de documento que requerem campos de cartão
const TIPOS_DOCUMENTO_CARTAO = ["Cartão crédito", "Cartão débito"] as const;

// Schema base para criar financeiro
export const criarFinanceiroSchema = z
	.object({
		idempresa: z.string().uuid("ID da empresa inválido"),
		documento: z
			.string()
			.max(60, "Documento deve ter no máximo 60 caracteres")
			.nullable()
			.optional(),
		pagamentoRecorrente: z.boolean().optional().default(false),
		tipoDocumento: z.enum([...TIPO_DOCUMENTO_OPTIONS], {
			message: "Tipo de documento é obrigatório",
		}),
		meses: z.number().int().min(0).nullable().optional(),
		tipoCobranca: z.number().int().nullable().optional(),
		entrada: z.string().nullable().optional(),
		referencia: z.string().nullable().optional(),
		emissao: z.string().min(1, "Data de emissão é obrigatória"),
		vencimento: z.string().min(1, "Data de vencimento é obrigatória"),
		idbanco: z.string().uuid("Banco é obrigatório"),
		identidade: z.string().uuid("Cliente é obrigatório"),
		idplanocontas: z.string().min(1, "Plano de contas é obrigatório"),
		valor: z
			.string()
			.min(1, "Valor é obrigatório")
			.refine(
				(val) => {
					const num = Number(val);
					return !Number.isNaN(num) && num > 0;
				},
				{ message: "Valor deve ser um número maior que zero" },
			),
		observacoes: z.string().nullable().optional(),
		iddependente: z.number().int().nullable().optional(),
		idportador: z.number().int().nullable().optional(),
		// Campos condicionais para cheque
		agencia: z.string().max(15).nullable().optional(),
		conta: z.string().max(40).nullable().optional(),
		emitente: z.string().max(60).nullable().optional(),
		cnpjcpfemitente: z.string().max(30).nullable().optional(),
		// Campos condicionais para cartão
		nomeadministradora: z.string().max(50).nullable().optional(),
		nomebandeira: z.string().max(50).nullable().optional(),
		idadministradora: z.number().int().nullable().optional(),
		idbandeira: z.number().int().nullable().optional(),
		tipo: z.enum(["P", "R"]).optional(), // P = Pagar, R = Receber
	})
	.superRefine((data, ctx) => {
		// Validação para campos de cheque
		if (TIPOS_DOCUMENTO_CHEQUE.includes(data.tipoDocumento as any)) {
			if (!data.agencia || data.agencia.trim() === "") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Agência é obrigatória para cheques",
					path: ["agencia"],
				});
			}
			if (!data.conta || data.conta.trim() === "") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Conta é obrigatória para cheques",
					path: ["conta"],
				});
			}
		}

		// Validação de datas
		if (data.emissao && data.vencimento) {
			const dataEmissao = new Date(data.emissao);
			const dataVencimento = new Date(data.vencimento);
			if (dataEmissao > dataVencimento) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"Data de emissão não pode ser posterior à data de vencimento",
					path: ["emissao"],
				});
			}
		}
	});

// Schema para atualizar financeiro (todos os campos opcionais exceto os que não podem ser alterados)
export const atualizarFinanceiroSchema = z
	.object({
		documento: z.string().max(60).nullable().optional(),
		pagamentoRecorrente: z.boolean().optional(),
		tipoDocumento: z.enum([...TIPO_DOCUMENTO_OPTIONS]).optional(),
		meses: z.number().int().min(0).nullable().optional(),
		tipoCobranca: z.number().int().nullable().optional(),
		entrada: z.string().nullable().optional(),
		referencia: z.string().nullable().optional(),
		emissao: z.string().optional(),
		vencimento: z.string().optional(),
		idbanco: z.string().uuid().nullable().optional(),
		identidade: z.string().uuid().nullable().optional(),
		idplanocontas: z.string().nullable().optional(),
		valor: z
			.string()
			.optional()
			.refine(
				(val) => {
					if (!val) return true;
					const num = Number(val);
					return !Number.isNaN(num) && num > 0;
				},
				{ message: "Valor deve ser um número maior que zero" },
			),
		observacoes: z.string().nullable().optional(),
		iddependente: z.number().int().nullable().optional(),
		idportador: z.number().int().nullable().optional(),
		// Campos condicionais para cheque
		agencia: z.string().max(15).nullable().optional(),
		conta: z.string().max(40).nullable().optional(),
		emitente: z.string().max(60).nullable().optional(),
		cnpjcpfemitente: z.string().max(30).nullable().optional(),
		// Campos condicionais para cartão
		nomeadministradora: z.string().max(50).nullable().optional(),
		nomebandeira: z.string().max(50).nullable().optional(),
		idadministradora: z.number().int().nullable().optional(),
		idbandeira: z.number().int().nullable().optional(),
	})
	.superRefine((data, ctx) => {
		// Validação para campos de cheque (se tipoDocumento estiver presente)
		if (
			data.tipoDocumento &&
			TIPOS_DOCUMENTO_CHEQUE.includes(data.tipoDocumento as any)
		) {
			if (
				data.agencia !== undefined &&
				(!data.agencia || data.agencia.trim() === "")
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Agência é obrigatória para cheques",
					path: ["agencia"],
				});
			}
			if (
				data.conta !== undefined &&
				(!data.conta || data.conta.trim() === "")
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Conta é obrigatória para cheques",
					path: ["conta"],
				});
			}
		}

		// Validação de datas
		if (data.emissao && data.vencimento) {
			const dataEmissao = new Date(data.emissao);
			const dataVencimento = new Date(data.vencimento);
			if (dataEmissao > dataVencimento) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"Data de emissão não pode ser posterior à data de vencimento",
					path: ["emissao"],
				});
			}
		}
	});

export type CriarFinanceiroFormData = z.infer<typeof criarFinanceiroSchema>;
export type AtualizarFinanceiroFormData = z.infer<
	typeof atualizarFinanceiroSchema
>;

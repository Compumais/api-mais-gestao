import { z } from "zod";

const idTextoOpcional = z.preprocess((valor) => {
	if (valor === "" || valor === null || valor === undefined) return null;
	return String(valor);
}, z.string().nullable().optional());

const numeroOpcional = z.preprocess((valor) => {
	if (valor === "" || valor === null || valor === undefined) return null;
	if (typeof valor === "number" && Number.isNaN(valor)) return null;
	const num = typeof valor === "string" ? Number(valor) : valor;
	if (typeof num === "number" && Number.isNaN(num)) return null;
	return num;
}, z.number().int().nullable().optional());

function descricaoNormalizada(texto: string): string {
	return texto
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{M}/gu, "");
}

/** Detecta título de cheque a partir da descrição ou código NF-e. */
export function isTipoDocumentoCheque(
	descricao?: string | null,
	formapagamentonfe?: string | null,
): boolean {
	if (formapagamentonfe === "02") return true;
	const d = descricaoNormalizada(descricao ?? "");
	return d.includes("cheque");
}

/** Detecta título de cartão a partir da descrição ou código NF-e. */
export function isTipoDocumentoCartao(
	descricao?: string | null,
	formapagamentonfe?: string | null,
): boolean {
	if (formapagamentonfe === "03" || formapagamentonfe === "04") return true;
	const d = descricaoNormalizada(descricao ?? "");
	return d.includes("cartao");
}

export const criarFinanceiroSchema = z
	.object({
		idempresa: z.string().uuid("ID da empresa inválido"),
		documento: z
			.string()
			.max(60, "Documento deve ter no máximo 60 caracteres")
			.nullable()
			.optional(),
		pagamentoRecorrente: z.boolean(),
		idtipodocumentofinanceiro: z
			.string()
			.uuid("Tipo de documento é obrigatório"),
		meses: numeroOpcional,
		tipoCobranca: z.string().uuid().nullable().optional(),
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
		iddependente: idTextoOpcional,
		idportador: idTextoOpcional,
		agencia: z.string().max(15).nullable().optional(),
		conta: z.string().max(40).nullable().optional(),
		emitente: z.string().max(60).nullable().optional(),
		cnpjcpfemitente: z.string().max(30).nullable().optional(),
		nomeadministradora: z.string().max(50).nullable().optional(),
		nomebandeira: z.string().max(50).nullable().optional(),
		idadministradora: idTextoOpcional,
		idbandeira: idTextoOpcional,
		tipo: z.enum(["P", "R"]).optional(),
	})
	.superRefine((data, ctx) => {
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

export const atualizarFinanceiroSchema = z
	.object({
		documento: z.string().max(60).nullable().optional(),
		pagamentoRecorrente: z.boolean(),
		idtipodocumentofinanceiro: z.string().uuid().nullable().optional(),
		meses: numeroOpcional,
		tipoCobranca: z.string().uuid().nullable().optional(),
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
		iddependente: idTextoOpcional,
		idportador: idTextoOpcional,
		agencia: z.string().max(15).nullable().optional(),
		conta: z.string().max(40).nullable().optional(),
		emitente: z.string().max(60).nullable().optional(),
		cnpjcpfemitente: z.string().max(30).nullable().optional(),
		nomeadministradora: z.string().max(50).nullable().optional(),
		nomebandeira: z.string().max(50).nullable().optional(),
		idadministradora: idTextoOpcional,
		idbandeira: idTextoOpcional,
	})
	.superRefine((data, ctx) => {
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

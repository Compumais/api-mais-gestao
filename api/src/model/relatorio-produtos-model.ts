import z from "zod/v4";

export const tiposRelatorioProdutos = [
	"qualidade",
	"cadastro",
	"ean",
	"precos",
	"estoque",
	"fiscal",
	"comercial",
	"compras",
	"movimentacoes",
	"unidades",
	"composicao",
	"auditoria",
] as const;

export const tipoRelatorioProdutosSchema = z.enum(tiposRelatorioProdutos);
export type TipoRelatorioProdutos = z.infer<typeof tipoRelatorioProdutosSchema>;

const dataSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD");

export const filtrosRelatorioProdutosSchema = z
	.object({
		idempresa: z.string().uuid(),
		q: z.string().trim().max(120).optional(),
		dataInicio: dataSchema.optional(),
		dataFim: dataSchema.optional(),
		situacao: z.enum(["ativo", "inativo", "todos"]).optional(),
		grupo: z.string().trim().max(120).optional(),
		fornecedor: z.string().trim().max(120).optional(),
		pendencia: z.string().trim().max(40).optional(),
		origem: z
			.enum(["pdv", "nota_fiscal", "acerto", "producao", "outro"])
			.optional(),
		tipoEstoque: z.enum(["operacional", "fiscal", "ambos"]).optional(),
		diasSemMovimento: z.coerce.number().int().min(0).max(36500).optional(),
		margemMin: z.coerce.number().min(-100000).max(100000).optional(),
		margemMax: z.coerce.number().min(-100000).max(100000).optional(),
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(200).default(20),
		ordenarPor: z.string().trim().max(40).optional(),
		ordem: z.enum(["asc", "desc"]).default("asc"),
	})
	.superRefine((valor, ctx) => {
		if (valor.dataInicio && valor.dataFim && valor.dataInicio > valor.dataFim) {
			ctx.addIssue({
				code: "custom",
				path: ["dataFim"],
				message: "Data final não pode ser anterior à inicial",
			});
		}
		if (
			valor.margemMin !== undefined &&
			valor.margemMax !== undefined &&
			valor.margemMin > valor.margemMax
		) {
			ctx.addIssue({
				code: "custom",
				path: ["margemMax"],
				message: "Margem máxima deve ser maior ou igual à mínima",
			});
		}
	});

export const exportacaoRelatorioProdutosSchema =
	filtrosRelatorioProdutosSchema.and(
		z.object({ formato: z.enum(["csv", "xlsx", "pdf"]) }),
	);

export type FiltrosRelatorioProdutos = z.infer<
	typeof filtrosRelatorioProdutosSchema
>;
export type ValorRelatorio = string | number | null;
export type LinhaRelatorioProdutos = Record<string, ValorRelatorio>;

export type ColunaRelatorioProdutos = {
	chave: string;
	label: string;
	tipo?: "texto" | "numero" | "moeda" | "percentual" | "data" | "datahora";
};

export type ResultadoRelatorioProdutos = {
	tipo: TipoRelatorioProdutos;
	titulo: string;
	colunas: ColunaRelatorioProdutos[];
	data: LinhaRelatorioProdutos[];
	resumo: Record<string, string | number>;
	paginacao: { page: number; limit: number; total: number; totalPages: number };
	avisos?: string[];
};

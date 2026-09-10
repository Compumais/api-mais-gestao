import { z } from "zod";
import { api } from "@/lib/axios";

export const tipoRelatorioProdutoSchema = z.enum([
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
]);

const valorRelatorioSchema = z.union([z.string(), z.number(), z.null()]);

export const colunaRelatorioProdutoSchema = z.object({
	chave: z.string().min(1),
	label: z.string().min(1),
	tipo: z
		.enum([
			"texto",
			"numero",
			"moeda",
			"percentual",
			"data",
			"datahora",
			"status",
		])
		.optional(),
});

export const relatorioProdutoSchema = z.object({
	tipo: tipoRelatorioProdutoSchema,
	titulo: z.string().min(1),
	colunas: z.array(colunaRelatorioProdutoSchema),
	data: z.array(z.record(z.string(), valorRelatorioSchema)),
	resumo: z.record(z.string(), z.union([z.string(), z.number()])),
	paginacao: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative(),
	}),
	avisos: z.array(z.string()).optional(),
});

export const filtrosRelatorioProdutoSchema = z.object({
	idempresa: z.string().uuid(),
	q: z.string().trim().optional(),
	dataInicio: z.string().optional(),
	dataFim: z.string().optional(),
	situacao: z.string().optional(),
	grupo: z.string().trim().optional(),
	fornecedor: z.string().trim().optional(),
	pendencia: z.string().optional(),
	diasSemMovimento: z.number().int().nonnegative().optional(),
	margemMin: z.number().optional(),
	margemMax: z.number().optional(),
	origem: z.string().trim().optional(),
	tipoEstoque: z.string().optional(),
	page: z.number().int().positive().default(1),
	limit: z.number().int().positive().max(200).default(20),
	ordenarPor: z.string().optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
});

export type TipoRelatorioProduto = z.infer<typeof tipoRelatorioProdutoSchema>;
export type ColunaRelatorioProduto = z.infer<
	typeof colunaRelatorioProdutoSchema
>;
export type RelatorioProduto = z.infer<typeof relatorioProdutoSchema>;
export type FiltrosRelatorioProduto = z.input<
	typeof filtrosRelatorioProdutoSchema
>;
export type FormatoExportacaoRelatorioProduto = "csv" | "xlsx" | "pdf";

function filtrosValidos(filtros: FiltrosRelatorioProduto) {
	const validados = filtrosRelatorioProdutoSchema.parse(filtros);
	return Object.fromEntries(
		Object.entries(validados).filter(
			([, valor]) => valor !== undefined && valor !== "",
		),
	);
}

export const relatoriosProdutosService = {
	async consultar(
		tipo: TipoRelatorioProduto,
		filtros: FiltrosRelatorioProduto,
	): Promise<RelatorioProduto> {
		const tipoValidado = tipoRelatorioProdutoSchema.parse(tipo);
		const { data } = await api.get<unknown>(
			`/relatorios/produtos/${tipoValidado}`,
			{ params: filtrosValidos(filtros) },
		);
		return relatorioProdutoSchema.parse(data);
	},

	async exportar(
		tipo: TipoRelatorioProduto,
		formato: FormatoExportacaoRelatorioProduto,
		filtros: FiltrosRelatorioProduto,
	): Promise<Blob> {
		const tipoValidado = tipoRelatorioProdutoSchema.parse(tipo);
		const { data } = await api.get<Blob>(
			`/relatorios/produtos/${tipoValidado}/exportar`,
			{
				params: { ...filtrosValidos(filtros), formato },
				responseType: "blob",
			},
		);
		return data;
	},
};

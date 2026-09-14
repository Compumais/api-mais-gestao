import { z } from "zod";
import {
	TIPOS_RELATORIO_PRODUTO,
	type TipoRelatorioProduto,
} from "@/constants/relatorios-produtos";
import { api } from "@/lib/axios";

const tipoSchema = z.enum(TIPOS_RELATORIO_PRODUTO);
const valorCelula = z.union([z.string(), z.number(), z.null()]);

const colunaSchema = z.object({
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

const respostaSchema = z.object({
	tipo: tipoSchema,
	titulo: z.string().min(1),
	colunas: z.array(colunaSchema),
	data: z.array(z.record(z.string(), valorCelula)),
	resumo: z.record(z.string(), z.union([z.string(), z.number()])),
	paginacao: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative(),
	}),
	avisos: z.array(z.string()).optional(),
});

export const filtrosRelatorioProdutosSchema = z.object({
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

export type FiltrosRelatorioProdutos = z.infer<
	typeof filtrosRelatorioProdutosSchema
>;
export type RelatorioProdutosResposta = z.infer<typeof respostaSchema>;
export type FormatoExportacaoRelatorioProdutos = "csv" | "xlsx" | "pdf";

function paramsLimpos(filtros: FiltrosRelatorioProdutos) {
	return Object.fromEntries(
		Object.entries(filtrosRelatorioProdutosSchema.parse(filtros)).filter(
			([, valor]) => valor !== undefined && valor !== "",
		),
	);
}

export const relatoriosProdutosService = {
	async consultar(
		tipo: TipoRelatorioProduto,
		filtros: FiltrosRelatorioProdutos,
	): Promise<RelatorioProdutosResposta> {
		const tipoValido = tipoSchema.parse(tipo);
		const { data } = await api.get(`/relatorios/produtos/${tipoValido}`, {
			params: paramsLimpos(filtros),
		});
		return respostaSchema.parse(data);
	},

	async exportar(
		tipo: TipoRelatorioProduto,
		formato: FormatoExportacaoRelatorioProdutos,
		filtros: FiltrosRelatorioProdutos,
	): Promise<Blob> {
		const tipoValido = tipoSchema.parse(tipo);
		const { data } = await api.get(
			`/relatorios/produtos/${tipoValido}/exportar`,
			{
				params: { ...paramsLimpos(filtros), formato },
				responseType: "blob",
			},
		);
		return data;
	},
};

export function baixarBlobRelatorio(blob: Blob, nomeArquivo: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = nomeArquivo;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function formatarChaveResumo(chave: string): string {
	return chave
		.replace(/([a-z\d])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.trim()
		.split(" ")
		.filter(Boolean)
		.map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
		.join(" ");
}

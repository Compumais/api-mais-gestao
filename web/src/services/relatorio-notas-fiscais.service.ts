import { z } from "zod";
import { api } from "@/lib/axios";

export const filtrosRelatorioNotasFiscaisSchema = z
	.object({
		dataInicio: z.string().min(1, "Informe a data inicial"),
		dataFim: z.string().min(1, "Informe a data final"),
		ambiente: z.enum(["todos", "1", "2"]),
		status: z.enum([
			"todos",
			"pendente",
			"autorizada",
			"cancelada",
			"inutilizada",
		]),
		modelo: z.enum(["todos", "55", "65"]),
		serie: z.string().max(6),
		numeroChave: z.string().max(60),
		destinatario: z.string().max(120),
	})
	.refine((valor) => valor.dataInicio <= valor.dataFim, {
		path: ["dataFim"],
		message: "Data final não pode ser anterior à inicial",
	});

export type FiltrosFormularioNotasFiscais = z.infer<
	typeof filtrosRelatorioNotasFiscaisSchema
>;

const linhaSchema = z.object({
	id: z.string(),
	tipo: z.enum(["NOTA_FISCAL", "INUTILIZACAO"]),
	dataHora: z.string().nullable(),
	modelo: z.enum(["55", "65"]),
	serie: z.string().nullable(),
	numeroInicial: z.string().nullable(),
	numeroFinal: z.string().nullable(),
	chave: z.string().nullable(),
	protocolo: z.string().nullable(),
	destinatario: z.string().nullable(),
	valorTotal: z.string().nullable(),
	statusCodigo: z.number(),
	status: z.string(),
	ambiente: z.union([z.literal(1), z.literal(2)]).nullable(),
	ambienteLabel: z.enum(["Produção", "Homologação", "Não informado"]),
});

const respostaSchema = z.object({
	data: z.array(linhaSchema),
	resumo: z.object({
		total: z.number(),
		porStatus: z.object({
			emitidasPendentes: z.number(),
			autorizadas: z.number(),
			canceladas: z.number(),
			inutilizadas: z.number(),
		}),
		porAmbiente: z.object({
			producao: z.number(),
			homologacao: z.number(),
			naoInformado: z.number(),
		}),
	}),
	paginacao: z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		totalPages: z.number(),
	}),
	avisos: z.array(z.string()),
});

export type LinhaRelatorioNotaFiscal = z.infer<typeof linhaSchema>;
export type RespostaRelatorioNotasFiscais = z.infer<typeof respostaSchema>;
export type FormatoExportacaoNotasFiscais = "csv" | "xlsx" | "pdf";

type ParametrosConsulta = FiltrosFormularioNotasFiscais & {
	idempresa: string;
	page: number;
	limit: number;
};

function limparParametros(parametros: ParametrosConsulta) {
	return Object.fromEntries(
		Object.entries(parametros).filter(([, valor]) => valor !== ""),
	);
}

export const relatorioNotasFiscaisService = {
	async consultar(
		parametros: ParametrosConsulta,
	): Promise<RespostaRelatorioNotasFiscais> {
		const resposta = await api.get("/relatorios/notas-fiscais", {
			params: limparParametros(parametros),
		});
		return respostaSchema.parse(resposta.data);
	},

	async exportar(
		formato: FormatoExportacaoNotasFiscais,
		parametros: ParametrosConsulta,
	): Promise<Blob> {
		const resposta = await api.get("/relatorios/notas-fiscais/exportar", {
			params: { ...limparParametros(parametros), formato },
			responseType: "blob",
		});
		return resposta.data as Blob;
	},
};

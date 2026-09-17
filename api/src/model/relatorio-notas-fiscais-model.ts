import z from "zod/v4";

const dataSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD");

export const statusRelatorioNotasFiscaisSchema = z.enum([
	"todos",
	"pendente",
	"autorizada",
	"cancelada",
	"inutilizada",
]);

export const ambienteRelatorioNotasFiscaisSchema = z.enum(["todos", "1", "2"]);

export const modeloRelatorioNotasFiscaisSchema = z.enum(["todos", "55", "65"]);

export const filtrosRelatorioNotasFiscaisSchema = z
	.object({
		idempresa: z.string().uuid(),
		dataInicio: dataSchema,
		dataFim: dataSchema,
		ambiente: ambienteRelatorioNotasFiscaisSchema.default("todos"),
		status: statusRelatorioNotasFiscaisSchema.default("todos"),
		modelo: modeloRelatorioNotasFiscaisSchema.default("todos"),
		serie: z.string().trim().max(6).optional(),
		numeroChave: z.string().trim().max(60).optional(),
		destinatario: z.string().trim().max(120).optional(),
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(200).default(20),
	})
	.superRefine((valor, ctx) => {
		if (valor.dataInicio > valor.dataFim) {
			ctx.addIssue({
				code: "custom",
				path: ["dataFim"],
				message: "Data final não pode ser anterior à inicial",
			});
		}
	});

export const exportacaoRelatorioNotasFiscaisSchema =
	filtrosRelatorioNotasFiscaisSchema.and(
		z.object({ formato: z.enum(["csv", "xlsx", "pdf"]) }),
	);

export type FiltrosRelatorioNotasFiscais = z.infer<
	typeof filtrosRelatorioNotasFiscaisSchema
>;

export type StatusRelatorioNotasFiscais = z.infer<
	typeof statusRelatorioNotasFiscaisSchema
>;

export type AmbienteFiscal = 1 | 2 | null;

export type LinhaRelatorioNotaFiscal = {
	id: string;
	tipo: "NOTA_FISCAL" | "INUTILIZACAO";
	dataHora: string | null;
	modelo: "55" | "65";
	serie: string | null;
	numeroInicial: string | null;
	numeroFinal: string | null;
	chave: string | null;
	protocolo: string | null;
	destinatario: string | null;
	valorTotal: string | null;
	statusCodigo: number;
	status: string;
	ambiente: AmbienteFiscal;
	ambienteLabel: "Produção" | "Homologação" | "Não informado";
};

export type ResumoRelatorioNotasFiscais = {
	total: number;
	porStatus: {
		emitidasPendentes: number;
		autorizadas: number;
		canceladas: number;
		inutilizadas: number;
	};
	porAmbiente: {
		producao: number;
		homologacao: number;
		naoInformado: number;
	};
};

export type ResultadoRelatorioNotasFiscais = {
	data: LinhaRelatorioNotaFiscal[];
	resumo: ResumoRelatorioNotasFiscais;
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	avisos: string[];
};

import { z } from "zod/v4";
import { gerarRelatorioContasPagar } from "@/service/relatorios/contas-pagar.service.js";
import { gerarRelatorioContasReceber } from "@/service/relatorios/contas-receber.service.js";
import { gerarRelatorioDespesasPorCategoria } from "@/service/relatorios/despesas-por-categoria.service.js";
import { gerarRelatorioDreGerencial } from "@/service/relatorios/dre-gerencial.service.js";
import { gerarRelatorioFiscalCompras } from "@/service/relatorios/fiscal-compras.service.js";
import { gerarRelatorioFiscalContabilidade } from "@/service/relatorios/fiscal-contabilidade.service.js";
import { gerarRelatorioFiscalVendas } from "@/service/relatorios/fiscal-vendas.service.js";
import { gerarRelatorioFluxoCaixa } from "@/service/relatorios/fluxo-caixa.service.js";
import type { DefinicaoTool } from "./tipos.js";
import { truncarConteudo } from "./util-tools.js";

const tiposRelatorio = [
	"fluxo-caixa",
	"contas-pagar",
	"contas-receber",
	"despesas-por-categoria",
	"dre-gerencial",
	"fiscal-compras",
	"fiscal-vendas",
	"fiscal-contabilidade",
] as const;

type TipoRelatorio = (typeof tiposRelatorio)[number];

async function gerarPorTipo(params: {
	tipo: TipoRelatorio;
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	formato: "txt" | "html";
}) {
	const base = {
		idempresa: params.idempresa,
		dataInicio: params.dataInicio,
		dataFim: params.dataFim,
		formato: params.formato,
	};

	switch (params.tipo) {
		case "fluxo-caixa":
			return gerarRelatorioFluxoCaixa(base);
		case "contas-pagar":
			return gerarRelatorioContasPagar(base);
		case "contas-receber":
			return gerarRelatorioContasReceber(base);
		case "despesas-por-categoria":
			return gerarRelatorioDespesasPorCategoria(base);
		case "dre-gerencial":
			return gerarRelatorioDreGerencial(base);
		case "fiscal-compras":
			return gerarRelatorioFiscalCompras(base);
		case "fiscal-vendas":
			return gerarRelatorioFiscalVendas(base);
		case "fiscal-contabilidade":
			return gerarRelatorioFiscalContabilidade(base);
	}
}

export const toolsRelatorios: DefinicaoTool[] = [
	{
		nome: "gerar_relatorio",
		descricao:
			"Gera um relatório já disponível no ERP (fluxo de caixa, contas, DRE, fiscais). Use formato txt ou html para caber no chat.",
		mutavel: false,
		schema: z.object({
			tipo: z.enum(tiposRelatorio).describe("Tipo do relatório"),
			dataInicio: z.string().describe("YYYY-MM-DD"),
			dataFim: z.string().describe("YYYY-MM-DD"),
			formato: z
				.enum(["txt", "html"])
				.optional()
				.describe("Padrão txt (melhor para o chat)"),
		}),
		executar: async (ctx, args) => {
			const { tipo, dataInicio, dataFim, formato } = args as {
				tipo: TipoRelatorio;
				dataInicio: string;
				dataFim: string;
				formato?: "txt" | "html";
			};

			try {
				const gerado = await gerarPorTipo({
					tipo,
					idempresa: ctx.idempresa,
					dataInicio,
					dataFim,
					formato: formato ?? "txt",
				});
				const bruto =
					typeof gerado.content === "string"
						? gerado.content
						: Buffer.isBuffer(gerado.content)
							? gerado.content.toString("utf8")
							: String(gerado.content);
				const conteudo = truncarConteudo(bruto, 6_000);
				return {
					ok: true,
					resumo: `Relatório ${tipo} gerado (${gerado.filename}).`,
					dados: {
						filename: gerado.filename,
						contentType: gerado.contentType,
						conteudo,
					},
				};
			} catch (error) {
				return {
					ok: false,
					resumo:
						error instanceof Error
							? error.message
							: "Falha ao gerar relatório",
				};
			}
		},
	},
];

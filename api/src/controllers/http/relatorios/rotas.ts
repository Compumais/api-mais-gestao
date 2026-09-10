import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { gerarRelatorioContasPagarController } from "./contas-pagar.js";
import { gerarRelatorioContasReceberController } from "./contas-receber.js";
import { gerarRelatorioDespesasPorCategoriaController } from "./despesas-por-categoria.js";
import { gerarRelatorioDreGerencialController } from "./dre-gerencial.js";
import { gerarRelatorioFiscalComprasController } from "./fiscal-compras.js";
import { gerarRelatorioFiscalContabilidadeController } from "./fiscal-contabilidade.js";
import { gerarRelatorioFiscalVendasController } from "./fiscal-vendas.js";
import { gerarRelatorioFluxoCaixaController } from "./fluxo-caixa.js";
import {
	exportarRelatorioProdutosController,
	listarRelatorioProdutosController,
} from "./produtos.js";

export async function relatoriosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/relatorios/produtos/:tipo", {
		schema: {
			tags: ["relatorios"],
			summary: "Consultar relatório consolidado de produtos",
			params: {
				type: "object",
				required: ["tipo"],
				properties: {
					tipo: {
						type: "string",
						enum: [
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
						],
					},
				},
			},
			querystring: {
				type: "object",
				required: ["idempresa"],
				properties: {
					idempresa: { type: "string", format: "uuid" },
					q: { type: "string" },
					dataInicio: { type: "string", format: "date" },
					dataFim: { type: "string", format: "date" },
					situacao: { type: "string", enum: ["ativo", "inativo", "todos"] },
					grupo: { type: "string" },
					fornecedor: { type: "string" },
					pendencia: { type: "string" },
					origem: {
						type: "string",
						enum: ["pdv", "nota_fiscal", "acerto", "producao", "outro"],
					},
					tipoEstoque: {
						type: "string",
						enum: ["operacional", "fiscal", "ambos"],
					},
					diasSemMovimento: { type: "integer", minimum: 0 },
					margemMin: { type: "number" },
					margemMax: { type: "number" },
					page: { type: "integer", minimum: 1, default: 1 },
					limit: { type: "integer", minimum: 1, maximum: 200, default: 20 },
					ordenarPor: { type: "string" },
					ordem: { type: "string", enum: ["asc", "desc"], default: "asc" },
				},
			},
		},
		handler: listarRelatorioProdutosController,
	});

	app.get("/relatorios/produtos/:tipo/exportar", {
		schema: {
			tags: ["relatorios"],
			summary: "Exportar relatório de produtos",
			params: {
				type: "object",
				required: ["tipo"],
				properties: { tipo: { type: "string" } },
			},
			querystring: {
				type: "object",
				required: ["idempresa", "formato"],
				additionalProperties: true,
				properties: {
					idempresa: { type: "string", format: "uuid" },
					formato: { type: "string", enum: ["csv", "xlsx", "pdf"] },
				},
			},
		},
		handler: exportarRelatorioProdutosController,
	});

	app.post("/relatorios/fluxo-caixa", {
		schema: {
			tags: ["relatorios"],
			summary: "Gerar relatório de fluxo de caixa",
			description:
				"Gera relatório de fluxo de caixa no formato especificado (PDF, TXT ou HTML)",
			body: {
				type: "object",
				required: ["idempresa", "dataInicio", "dataFim", "formato"],
				properties: {
					idempresa: {
						type: "string",
						format: "uuid",
						description: "ID da empresa",
					},
					dataInicio: {
						type: "string",
						pattern: "^\\d{4}-\\d{2}-\\d{2}$",
						description: "Data inicial no formato YYYY-MM-DD",
					},
					dataFim: {
						type: "string",
						pattern: "^\\d{4}-\\d{2}-\\d{2}$",
						description: "Data final no formato YYYY-MM-DD",
					},
					formato: {
						type: "string",
						enum: ["pdf", "txt", "html"],
						description: "Formato do relatório",
					},
				},
			},
			response: {
				200: {
					description: "Relatório gerado com sucesso",
					content: {
						"text/plain": {
							schema: { type: "string" },
						},
						"text/html": {
							schema: { type: "string" },
						},
						"application/pdf": {
							schema: { type: "string", format: "binary" },
						},
					},
				},
				400: {
					type: "object",
					properties: {
						error: { type: "string" },
						code: { type: "string" },
						details: { type: "array" },
					},
				},
				401: {
					type: "object",
					properties: {
						error: { type: "string" },
						code: { type: "string" },
					},
				},
				500: {
					type: "object",
					properties: {
						error: { type: "string" },
						code: { type: "string" },
					},
				},
			},
		},
		handler: gerarRelatorioFluxoCaixaController,
	});

	const relatorioBodySchema = {
		type: "object" as const,
		required: ["idempresa", "dataInicio", "dataFim", "formato"],
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
			dataInicio: {
				type: "string",
				pattern: "^\\d{4}-\\d{2}-\\d{2}$",
				description: "Data inicial (YYYY-MM-DD)",
			},
			dataFim: {
				type: "string",
				pattern: "^\\d{4}-\\d{2}-\\d{2}$",
				description: "Data final (YYYY-MM-DD)",
			},
			formato: {
				type: "string",
				enum: ["pdf", "txt", "html"],
				description: "Formato do relatório",
			},
		},
	};
	const relatorioResponseSchema = {
		200: {
			description: "Relatório gerado com sucesso",
			content: {
				"text/plain": { schema: { type: "string" } },
				"text/html": { schema: { type: "string" } },
				"application/pdf": { schema: { type: "string", format: "binary" } },
			},
		},
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
				details: { type: "array" },
			},
		},
		401: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
		500: {
			type: "object",
			properties: { error: { type: "string" }, code: { type: "string" } },
		},
	};

	app.post("/relatorios/contas-pagar", {
		schema: {
			tags: ["relatorios"],
			summary: "Gerar relatório de contas a pagar",
			description:
				"Gera relatório de contas a pagar por período de vencimento (PDF, TXT ou HTML)",
			body: relatorioBodySchema,
			response: relatorioResponseSchema,
		},
		handler: gerarRelatorioContasPagarController,
	});

	app.post("/relatorios/contas-receber", {
		schema: {
			tags: ["relatorios"],
			summary: "Gerar relatório de contas a receber",
			description:
				"Gera relatório de contas a receber por período de vencimento (PDF, TXT ou HTML)",
			body: relatorioBodySchema,
			response: relatorioResponseSchema,
		},
		handler: gerarRelatorioContasReceberController,
	});

	app.post("/relatorios/despesas-por-categoria", {
		schema: {
			tags: ["relatorios"],
			summary: "Gerar relatório de despesas por categoria",
			description:
				"Gera relatório de despesas agrupadas por plano de contas no período (PDF, TXT ou HTML)",
			body: relatorioBodySchema,
			response: relatorioResponseSchema,
		},
		handler: gerarRelatorioDespesasPorCategoriaController,
	});

	app.post("/relatorios/dre-gerencial", {
		schema: {
			tags: ["relatorios"],
			summary: "Gerar relatório DRE Gerencial",
			description:
				"Gera Demonstração do Resultado do Exercício gerencial no período (PDF, TXT ou HTML)",
			body: relatorioBodySchema,
			response: relatorioResponseSchema,
		},
		handler: gerarRelatorioDreGerencialController,
	});

	app.post("/relatorios/fiscal-compras", {
		schema: {
			tags: ["relatorios"],
			summary: "Gerar relatório fiscal de compras",
			description:
				"Gera relatório analítico de NF-e de entrada no período (PDF, TXT ou HTML)",
			body: relatorioBodySchema,
			response: relatorioResponseSchema,
		},
		handler: gerarRelatorioFiscalComprasController,
	});

	app.post("/relatorios/fiscal-vendas", {
		schema: {
			tags: ["relatorios"],
			summary: "Gerar relatório fiscal de vendas",
			description:
				"Gera relatório analítico de NF-e/NFC-e de saída no período (PDF, TXT ou HTML)",
			body: relatorioBodySchema,
			response: relatorioResponseSchema,
		},
		handler: gerarRelatorioFiscalVendasController,
	});

	app.post("/relatorios/fiscal-contabilidade", {
		schema: {
			tags: ["relatorios"],
			summary: "Gerar relatório fiscal consolidado",
			description:
				"Gera relatório consolidado para contabilidade no período (PDF, TXT ou HTML)",
			body: relatorioBodySchema,
			response: relatorioResponseSchema,
		},
		handler: gerarRelatorioFiscalContabilidadeController,
	});
}

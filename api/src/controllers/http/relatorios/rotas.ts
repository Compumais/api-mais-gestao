import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { gerarRelatorioContasPagarController } from "./contas-pagar.js";
import { gerarRelatorioContasReceberController } from "./contas-receber.js";
import { gerarRelatorioFiscalComprasController } from "./fiscal-compras.js";
import { gerarRelatorioFiscalContabilidadeController } from "./fiscal-contabilidade.js";
import { gerarRelatorioFiscalVendasController } from "./fiscal-vendas.js";
import { gerarRelatorioFluxoCaixaController } from "./fluxo-caixa.js";

export async function relatoriosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

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

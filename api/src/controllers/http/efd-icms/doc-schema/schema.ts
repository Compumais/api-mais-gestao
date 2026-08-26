import type { FastifySchema } from "fastify";

export const gerarEfdIcmsSchema: FastifySchema = {
	tags: ["efd"],
	summary: "Gerar arquivo EFD ICMS/IPI",
	description:
		"Gera a Escrituração Fiscal Digital ICMS/IPI (leiaute vigente na competência) para o mês informado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
			dataInicio: { type: "string", description: "YYYY-MM-DD" },
			dataFim: { type: "string", description: "YYYY-MM-DD" },
			finalidade: {
				type: "string",
				enum: ["0", "1"],
				description: "0=Original, 1=Substituto",
			},
			incluirInventario: { type: "boolean" },
			dataInventario: { type: "string" },
		},
		required: ["idempresa", "dataInicio", "dataFim"],
	},
};

export const gerarEfdContribuicoesSchema: FastifySchema = {
	tags: ["efd"],
	summary: "Gerar arquivo EFD-Contribuições (PIS/COFINS)",
	description:
		"Gera a EFD-Contribuições para Lucro Presumido/Real. Bloqueada para CRT Simples.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
			dataInicio: { type: "string" },
			dataFim: { type: "string" },
			finalidade: { type: "string", enum: ["0", "1"] },
		},
		required: ["idempresa", "dataInicio", "dataFim"],
	},
};

import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

export function criarProximoCodigoSchema(
	tag: string,
	tipoCodigo: "number" | "string",
): FastifySchema {
	return {
		tags: [tag],
		summary: "Buscar próximo código",
		description:
			"Retorna o próximo código sequencial sugerido para a empresa (MAX + 1).",
		security: [{ bearerAuth: [] }],
		querystring: {
			type: "object",
			properties: {
				idempresa: { type: "string", description: "ID da empresa" },
			},
			required: ["idempresa"],
		},
		response: {
			200: {
				type: "object",
				properties: {
					codigo: { type: tipoCodigo },
				},
				required: ["codigo"],
			},
			400: {
				type: "object",
				properties: {
					error: { type: "string" },
					code: { type: "string" },
					details: { type: "array" },
				},
			},
			401: respostaErro,
			403: respostaErro,
			500: respostaErro,
		},
	};
}

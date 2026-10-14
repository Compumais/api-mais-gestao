import type { FastifySchema } from "fastify";

const respostasPadrao = {
	400: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
		},
	},
	401: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
		},
	},
	403: {
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
};

const corpoConfiguracao = {
	type: "object",
	properties: {
		modeloAtendimento: { type: "string", enum: ["mesa", "comanda"] },
		etiqueta_balanca_habilitada: { type: "string", enum: ["0", "1"] },
		etiqueta_balanca_prefixo: { type: "string" },
		etiqueta_balanca_digitos_codigo: { type: "string", enum: ["4", "5", "6"] },
		etiqueta_balanca_conteudo: { type: "string", enum: ["preco", "peso"] },
		etiqueta_balanca_centavos: { type: "string", enum: ["0", "1"] },
		etiqueta_balanca_indicador_uso: { type: "string", enum: ["0", "1"] },
	},
};

export const buscarConfiguracaoPdvSchema: FastifySchema = {
	tags: ["configuracao-pdv"],
	summary: "Buscar operação de PDV da empresa",
	description:
		"Devolve o modo mesas/comandas e o formato da etiqueta de balança. Sem registro, retorna o padrão.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true, ...corpoConfiguracao },
		...respostasPadrao,
	},
};

export const salvarConfiguracaoPdvSchema: FastifySchema = {
	tags: ["configuracao-pdv"],
	summary: "Salvar operação de PDV da empresa",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			...(corpoConfiguracao.properties),
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...respostasPadrao,
	},
};

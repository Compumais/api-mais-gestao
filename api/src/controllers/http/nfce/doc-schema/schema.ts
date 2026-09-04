import type { FastifySchema } from "fastify";

const erroPadrao = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
		details: { type: "array" },
	},
} as const;

const itemDetalheSchema = {
	type: "object",
	properties: {
		nome: { type: "string" },
		codigo: { type: "number", nullable: true },
		quantidade: { type: "string" },
		precounitario: { type: "string" },
		valortotal: { type: "string" },
		unidade: { type: "string", nullable: true },
		ncm: { type: "string", nullable: true },
		cfop: { type: "string", nullable: true },
		cst: { type: "string", nullable: true },
		csosn: { type: "string", nullable: true },
	},
} as const;

export const buscarDetalhesNfceSchema: FastifySchema = {
	tags: ["nfce"],
	summary: "Detalhes da NFC-e",
	description:
		"Retorna cabeçalho, itens, meios de pagamento e rejeição SEFAZ da NFC-e. Indica se há chave de IA configurada para interpretação.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		required: ["idnotafiscal"],
		properties: {
			idnotafiscal: {
				type: "string",
				format: "uuid",
				description: "ID da NFC-e",
			},
		},
	},
	querystring: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
		},
	},
	response: {
		200: {
			type: "object",
			description: "Detalhes da NFC-e",
			properties: {
				nota: {
					type: "object",
					properties: {
						idnotafiscal: { type: "string" },
						idvenda: { type: "string", nullable: true },
						numeronotafiscal: { type: "string", nullable: true },
						serie: { type: "string", nullable: true },
						chavenfe: { type: "string", nullable: true },
						protocolonfe: { type: "string", nullable: true },
						status: { type: "number", nullable: true },
						tipoambientenfe: { type: "number", nullable: true },
						valortotalnota: { type: "string", nullable: true },
						emissao: { type: "string", nullable: true },
						datahoraemissao: { type: "string", nullable: true },
					},
				},
				itens: { type: "array", items: itemDetalheSchema },
				pagamentos: {
					type: "array",
					items: {
						type: "object",
						properties: {
							meio: { type: "string" },
							label: { type: "string" },
							valor: { type: "number" },
						},
					},
				},
				troco: { type: "number" },
				rejeicao: {
					type: "object",
					nullable: true,
					properties: {
						cStat: { type: "string", nullable: true },
						xMotivo: { type: "string", nullable: true },
					},
				},
				contextoFiscal: {
					type: "object",
					properties: {
						crt: { type: "number", nullable: true },
						uf: { type: "string", nullable: true },
					},
				},
				iaDisponivel: { type: "boolean" },
			},
		},
		400: erroPadrao,
		401: erroPadrao,
		403: erroPadrao,
		404: erroPadrao,
		500: erroPadrao,
	},
};

export const interpretarRejeicaoNfceSchema: FastifySchema = {
	tags: ["nfce"],
	summary: "Interpretar rejeição SEFAZ da NFC-e",
	description:
		"Usa a chave de IA das integrações (Gemini, OpenAI ou OpenRouter) para explicar a rejeição e sugerir correção no ERP. Sem chave, retorna 200 com estado vazio.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		required: ["idnotafiscal"],
		properties: {
			idnotafiscal: {
				type: "string",
				format: "uuid",
				description: "ID da NFC-e",
			},
		},
	},
	body: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
		},
	},
	response: {
		200: {
			type: "object",
			description: "Interpretação da rejeição",
			properties: {
				interpretado: { type: "boolean" },
				motivoNaoInterpretado: {
					type: "string",
					nullable: true,
					enum: ["sem_chave", "sem_rejeicao", "erro_ia", null],
				},
				mensagem: { type: "string", nullable: true },
				provedor: { type: "string", nullable: true },
				classificacao: {
					type: "string",
					nullable: true,
					enum: ["PROVAVEL", "INDETERMINADA", null],
				},
				explicacao: { type: "string", nullable: true },
				comoCorrigir: { type: "string", nullable: true },
			},
		},
		400: erroPadrao,
		401: erroPadrao,
		403: erroPadrao,
		404: erroPadrao,
		500: erroPadrao,
	},
};

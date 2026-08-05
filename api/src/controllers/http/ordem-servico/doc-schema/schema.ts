import type { FastifySchema } from "fastify";

export const criarOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Criar ordem de serviço",
	description:
		"Cria um novo registro de ordem de serviço na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },
			codigo: { type: "string" },
			"...": { type: "string", description: "Demais campos da entidade" },
		},
		required: ["idempresa"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
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
	},
};

export const buscarOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Buscar ordem de serviço por ID",
	description: "Retorna os dados de um registro de ordem de serviço.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", description: "ID do registro" },
		},
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
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
	},
};

export const listarOrdemServicosSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Listar ordens de serviço",
	description: "Lista registros de ordens de serviço com paginação.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa" },

			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: {
					type: "array",
					items: { type: "object", additionalProperties: true },
				},
				paginacao: {
					type: "object",
					properties: {
						page: { type: "number" },
						limit: { type: "number" },
						total: { type: "number" },
						totalPages: { type: "number" },
					},
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
	},
};

export const atualizarOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Atualizar ordem de serviço",
	description: "Atualiza um registro de ordem de serviço.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
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
	},
};

export const excluirOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Excluir ordem de serviço",
	description: "Exclui um registro de ordem de serviço.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
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
	},
};

const erroPadrao = {
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
	403: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
		},
	},
	404: {
		type: "object",
		properties: {
			error: { type: "string" },
			code: { type: "string" },
		},
	},
	409: {
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
} as const;

const paramsOs = {
	type: "object",
	properties: { id: { type: "string", format: "uuid" } },
	required: ["id"],
} as const;

const queryEmpresa = {
	type: "object",
	properties: { idempresa: { type: "string", format: "uuid" } },
	required: ["idempresa"],
} as const;

export const listarItensOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Listar itens da ordem de serviço",
	security: [{ bearerAuth: [] }],
	params: paramsOs,
	querystring: queryEmpresa,
	response: {
		200: {
			type: "array",
			items: { type: "object", additionalProperties: true },
		},
		...erroPadrao,
	},
};

export const criarItemOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Criar item da ordem de serviço",
	security: [{ bearerAuth: [] }],
	params: paramsOs,
	body: {
		type: "object",
		required: ["idempresa", "idproduto", "quantidade", "preco"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			idproduto: { type: "string", format: "uuid" },
			quantidade: { type: "string" },
			preco: { type: "string" },
			idtecnico: { type: ["string", "null"] },
			idcfop: {
				anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
			},
			unidademedida: { anyOf: [{ type: "string" }, { type: "null" }] },
			observacao: { anyOf: [{ type: "string" }, { type: "null" }] },
			tipoEsperado: { type: "string", enum: ["P", "S"] },
		},
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...erroPadrao,
	},
};

export const atualizarItemOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Atualizar item da ordem de serviço",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			iditem: { type: "string", format: "uuid" },
		},
		required: ["id", "iditem"],
	},
	body: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			quantidade: { type: "string" },
			preco: { type: "string" },
			idtecnico: { type: ["string", "null"] },
			idcfop: { type: ["string", "null"] },
			unidademedida: { type: ["string", "null"] },
			observacao: { type: ["string", "null"] },
			cancelado: { type: "integer" },
			tipoEsperado: { type: "string", enum: ["P", "S"] },
		},
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...erroPadrao,
	},
};

export const excluirItemOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Excluir item da ordem de serviço",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			iditem: { type: "string", format: "uuid" },
		},
		required: ["id", "iditem"],
	},
	querystring: queryEmpresa,
	response: {
		204: { type: "null" },
		...erroPadrao,
	},
};

export const listarLotesItemOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Listar lotes do item",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			iditem: { type: "string", format: "uuid" },
		},
		required: ["id", "iditem"],
	},
	querystring: queryEmpresa,
	response: {
		200: {
			type: "array",
			items: { type: "object", additionalProperties: true },
		},
		...erroPadrao,
	},
};

export const criarLoteItemOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Criar lote do item",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			iditem: { type: "string", format: "uuid" },
		},
		required: ["id", "iditem"],
	},
	body: {
		type: "object",
		required: ["idempresa", "quantidade"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			codigolote: { type: "string" },
			quantidade: { type: "string" },
			vencimento: { type: "string" },
			datalote: { type: "string" },
			emissao: { type: "string" },
			idlote: { type: "string" },
		},
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...erroPadrao,
	},
};

export const atualizarLoteItemOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Atualizar lote do item",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			iditem: { type: "string", format: "uuid" },
			idlote: { type: "string", format: "uuid" },
		},
		required: ["id", "iditem", "idlote"],
	},
	body: {
		type: "object",
		required: ["idempresa"],
		additionalProperties: true,
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...erroPadrao,
	},
};

export const excluirLoteItemOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Excluir lote do item",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
			iditem: { type: "string", format: "uuid" },
			idlote: { type: "string", format: "uuid" },
		},
		required: ["id", "iditem", "idlote"],
	},
	querystring: queryEmpresa,
	response: {
		204: { type: "null" },
		...erroPadrao,
	},
};

export const listarEventosOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Listar eventos da ordem de serviço",
	security: [{ bearerAuth: [] }],
	params: paramsOs,
	querystring: queryEmpresa,
	response: {
		200: {
			type: "array",
			items: { type: "object", additionalProperties: true },
		},
		...erroPadrao,
	},
};

export const criarEventoOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Registrar evento/status na ordem de serviço",
	security: [{ bearerAuth: [] }],
	params: paramsOs,
	body: {
		type: "object",
		required: ["idempresa", "idtipoevento", "descricao"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			idtipoevento: { type: "string", format: "uuid" },
			descricao: { type: "string" },
			idtecnicode: { type: "string" },
			idtecnicopara: { type: "string" },
			nomecontato: { type: "string" },
		},
	},
	response: {
		201: { type: "object", additionalProperties: true },
		...erroPadrao,
	},
};

export const listarFaturamentosOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Listar vínculos de faturamento da OS",
	security: [{ bearerAuth: [] }],
	params: paramsOs,
	querystring: queryEmpresa,
	response: {
		200: {
			type: "array",
			items: { type: "object", additionalProperties: true },
		},
		...erroPadrao,
	},
};

export const gerarContasReceberOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Gerar contas a receber a partir da OS (idempotente)",
	security: [{ bearerAuth: [] }],
	params: paramsOs,
	body: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			formasPagamento: {
				type: "array",
				items: {
					type: "object",
					required: ["idtipodocumentofinanceiro", "valor"],
					properties: {
						idtipodocumentofinanceiro: { type: "string", format: "uuid" },
						valor: { type: "number" },
						indPag: { type: "integer" },
					},
				},
			},
		},
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...erroPadrao,
	},
};

export const gerarNfeRascunhoOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Gerar NF-e pendente (rascunho) a partir da OS",
	description:
		"Cria nota fiscal modelo 55 com status 90 (pendente), sem transmitir à SEFAZ. Itens de serviço não entram na NF-e.",
	security: [{ bearerAuth: [] }],
	params: paramsOs,
	body: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			idserienfe: { type: "string", format: "uuid" },
			formasPagamento: {
				type: "array",
				items: {
					type: "object",
					required: ["idtipodocumentofinanceiro", "valor"],
					properties: {
						idtipodocumentofinanceiro: { type: "string", format: "uuid" },
						valor: { type: "number" },
						indPag: { type: "integer" },
					},
				},
			},
		},
	},
	response: {
		201: {
			type: "object",
			properties: {
				idnotafiscal: { type: "string" },
				status: { type: "integer" },
				idordemservico: { type: "string" },
			},
			additionalProperties: true,
		},
		...erroPadrao,
	},
};

export const prepararNfseOrdemServicoSchema: FastifySchema = {
	tags: ["ordens-servico"],
	summary: "Preparar rascunho de NFS-e a partir dos serviços da OS",
	description:
		"Valida e monta os dados da NFS-e sem transmitir ao município. Gera o financeiro da OS de forma idempotente.",
	security: [{ bearerAuth: [] }],
	params: paramsOs,
	body: {
		type: "object",
		required: ["idempresa"],
		properties: {
			idempresa: { type: "string", format: "uuid" },
			formasPagamento: {
				type: "array",
				items: {
					type: "object",
					required: ["idtipodocumentofinanceiro", "valor"],
					properties: {
						idtipodocumentofinanceiro: { type: "string", format: "uuid" },
						valor: { type: "number" },
						indPag: { type: "integer" },
					},
				},
			},
		},
	},
	response: {
		200: { type: "object", additionalProperties: true },
		...erroPadrao,
	},
};

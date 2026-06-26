import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const itemNotaFiscalBody = {
	type: "object",
	properties: {
		idproduto: {
			type: "string",
			description: "ID do produto já cadastrado. Se omitido, busca por codigo/ean ou cria novo.",
		},
		codigoproduto: {
			type: "number",
			description: "Código interno do produto para lookup automático.",
		},
		ean: {
			type: "number",
			description: "Código EAN/barras do produto para lookup automático.",
		},
		descricaoproduto: {
			type: "string",
			description: "Descrição usada para busca ou cadastro automático do produto.",
		},
		descricao: { type: "string", maxLength: 120, description: "Descrição do item na nota." },
		quantidade: { type: "string" },
		precounitario: { type: "string" },
		total: { type: "string" },
		desconto: { type: "string" },
		idcfop: { type: "string", description: "ID do CFOP (FK tabela cfop)." },
		cfop: { type: "string", maxLength: 20, description: "Código CFOP textual." },
		idncm: { type: "string", description: "ID do NCM (FK tabela ncm)." },
		ncm: { type: "string", maxLength: 11 },
		idunidademedida: { type: "string", description: "ID da unidade de medida (FK)." },
		unidade: { type: "string", maxLength: 6 },
		situacaotributaria: { type: "string", maxLength: 3, description: "CST ICMS." },
		cstpis: { type: "string", maxLength: 2 },
		cstcofins: { type: "string", maxLength: 2 },
		percentualicms: { type: "string" },
		baseicms: { type: "string" },
		icms: { type: "string" },
		aliquotapis: { type: "string" },
		aliquotacofins: { type: "string" },
		pis: { type: "string" },
		cofins: { type: "string" },
		pisretido: { type: "string" },
		cofinsretido: { type: "string" },
		ipi: { type: "string" },
		inss: { type: "string" },
		frete: { type: "string" },
		seguro: { type: "string" },
		outrasdespesas: { type: "string" },
		origem: {
			type: "number",
			description: "Origem da mercadoria: 0=Nacional, 1=Estrangeira importação direta.",
		},
		custoaquisicao: { type: "string" },
		referenciafornecedor: { type: "string", maxLength: 60 },
		informacaoadicional: { type: "string", maxLength: 500 },
	},
};

export const criarNotaFiscalSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Criar nota fiscal de compra",
	description:
		"Cria uma nota fiscal de compra (entrada) com itens. Suporta vinculação automática de produtos por ID, código, EAN ou cadastro automático. Gera custos e contas a pagar conforme configuração.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			identidade: { type: "string", nullable: true, description: "ID do fornecedor (entidade)." },
			numero: { type: "string", nullable: true, description: "Número da nota fiscal." },
			numeronotafiscal: { type: "string", nullable: true, maxLength: 11 },
			serie: { type: "string", nullable: true },
			modelo: { type: "string", nullable: true, description: "Modelo: 55=NF-e, 65=NFC-e." },
			chavenfe: { type: "string", nullable: true, maxLength: 44 },
			emissao: { type: "string", nullable: true, description: "Data de emissão (YYYY-MM-DD)." },
			entradasaida: { type: "string", nullable: true, description: "Data de entrada (YYYY-MM-DD)." },
			datahoraemissao: { type: "string", nullable: true },
			datahoraentradasaida: { type: "string", nullable: true },
			tipodocumento: { type: "string", nullable: true, maxLength: 2 },
			idcfop: { type: "string", nullable: true, description: "CFOP principal da nota (FK)." },
			idoperacaofiscal: { type: "string", nullable: true, description: "ID da operação fiscal (FK)." },
			idplanocontas: { type: "string", nullable: true, description: "ID do plano de contas para lançamentos." },
			idcondicaopagto: { type: "string", nullable: true, description: "ID da condição de pagamento. Dispara geração de contas a pagar." },
			idtipodocumento: { type: "string", nullable: true, description: "ID do tipo de documento financeiro (FK)." },
			totalproduto: { type: "string", nullable: true },
			totalservicos: { type: "string", nullable: true },
			valortotalnota: { type: "string", nullable: true },
			frete: { type: "string", nullable: true },
			seguro: { type: "string", nullable: true },
			outrasdespesas: { type: "string", nullable: true },
			descontoproduto: { type: "string", nullable: true },
			descontoservicos: { type: "string", nullable: true },
			baseicms: { type: "string", nullable: true },
			icms: { type: "string", nullable: true },
			icmssubstituicao: { type: "string", nullable: true },
			ipi: { type: "string", nullable: true },
			pis: { type: "string", nullable: true },
			cofins: { type: "string", nullable: true },
			pisretido: { type: "string", nullable: true },
			cofinsretido: { type: "string", nullable: true },
			inss: { type: "string", nullable: true },
			avista: { type: "string", nullable: true, description: "Valor pago à vista." },
			aprazo: { type: "string", nullable: true, description: "Valor a prazo." },
			pesobruto: { type: "string", nullable: true },
			pesoliquido: { type: "string", nullable: true },
			cnpjemissor: { type: "string", nullable: true, maxLength: 14 },
			razaosocial: { type: "string", nullable: true, maxLength: 60 },
			inscricaoestadual: { type: "string", nullable: true, maxLength: 20 },
			observacao: { type: "string", nullable: true },
			status: { type: "number", nullable: true },
			gerarCustos: { type: "boolean", default: true },
			gerarFinanceiro: {
				type: "boolean",
				default: true,
				description: "Gerar contas a pagar automaticamente se idcondicaopagto for informado.",
			},
			itens: { type: "array", items: itemNotaFiscalBody, minItems: 1 },
		},
		required: ["idempresa", "itens"],
	},
	response: {
		201: {
			type: "object",
			description: "Nota fiscal criada com sucesso",
			properties: {
				notaFiscal: { type: "object", additionalProperties: true },
				itens: { type: "array", items: { type: "object", additionalProperties: true } },
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
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const listarNotasFiscaisSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Listar notas fiscais de compra",
	description: "Lista notas fiscais por empresa com paginação e filtros.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			numero: { type: "string" },
			identidade: { type: "string" },
			status: { type: "number" },
			tipoorigem: { type: "number", description: "0=Compra (entrada)." },
			idcfop: { type: "string" },
			dataInicio: { type: "string", description: "Filtro data emissão início (YYYY-MM-DD)." },
			dataFim: { type: "string", description: "Filtro data emissão fim (YYYY-MM-DD)." },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				data: { type: "array", items: { type: "object", additionalProperties: true } },
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
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const buscarNotaFiscalSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Buscar nota fiscal por ID",
	description: "Retorna a nota fiscal e seus itens.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const atualizarNotaFiscalSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Atualizar nota fiscal de compra",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	body: {
		type: "object",
		additionalProperties: true,
	},
	response: {
		200: { type: "object", additionalProperties: true },
		400: {
			type: "object",
			properties: {
				error: { type: "string" },
				code: { type: "string" },
				details: { type: "array" },
			},
		},
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const excluirNotaFiscalSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Excluir nota fiscal de compra",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" } },
		required: ["id"],
	},
	response: {
		204: { type: "null" },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const importarXmlNFSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Importar nota fiscal de compra a partir de XML NF-e (legado → rascunho)",
	description: `Cria um rascunho de importação (status 99) para revisão antes da confirmação.
Preferir POST /notas-fiscais/importar-xml/rascunho. Este endpoint mantém compatibilidade e retorna idRascunho.`,
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		additionalProperties: false,
		properties: {
			idempresa: { type: "string", description: "ID da empresa destino." },
			xml: {
				type: "string",
				description:
					"Conteúdo completo do XML NF-e (nfeProc ou NFe). O frontend deve ler o arquivo .xml e enviar o conteúdo como string.",
			},
			idplanocontas: {
				type: ["string", "null"],
				description: "Sobrescreve o plano de contas para os lançamentos.",
			},
			idcondicaopagto: {
				type: ["string", "null"],
				description:
					"Se informado, gera contas a pagar conforme a condição de pagamento.",
			},
			idtipodocumento: {
				type: ["string", "null"],
				description: "Tipo de documento financeiro para as contas a pagar.",
			},
			idoperacaofiscal: {
				type: ["string", "null"],
				description: "Operação fiscal a ser vinculada.",
			},
			gerarCustos: {
				type: "boolean",
				description: "Registra o custo de aquisição nos produtos.",
			},
			gerarFinanceiro: {
				type: "boolean",
				description: "Gera contas a pagar se idcondicaopagto for informado.",
			},
		},
		required: ["idempresa", "xml"],
	},
	response: {
		201: {
			type: "object",
			description: "Rascunho criado para revisão",
			properties: {
				idRascunho: { type: "string" },
				nota: { type: "object", additionalProperties: true },
				itens: {
					type: "array",
					items: { type: "object", additionalProperties: true },
				},
				mensagem: { type: "string" },
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
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const buscarProdutoNFSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Buscar produto para vincular na NF de compra",
	description:
		"Busca um produto por código, EAN ou descrição parcial. Útil para o front-end verificar se o produto existe antes de lançar a NF. Retorna encontrado=false quando não existe.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", description: "ID da empresa." },
			q: { type: "string", description: "Busca por descrição parcial." },
			codigo: { type: "string", description: "Código interno do produto." },
			ean: { type: "string", description: "Código EAN/barras." },
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				encontrado: { type: "boolean" },
				produto: {
					nullable: true,
					type: "object",
					additionalProperties: true,
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
		401: respostaErro,
		500: respostaErro,
	},
};

const rascunhoBodyBase = {
	idempresa: { type: "string" },
	idplanocontas: { type: ["string", "null"] },
	idcondicaopagto: { type: ["string", "null"] },
	idtipodocumento: { type: ["string", "null"] },
	idoperacaofiscal: { type: ["string", "null"] },
};

export const criarRascunhoImportacaoXmlSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Criar rascunho de importação NF-e",
	description:
		"Parseia o XML NF-e e persiste um rascunho (status 99) com match read-only de produtos/fornecedor/CFOP.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			...rascunhoBodyBase,
			xml: { type: "string" },
		},
		required: ["idempresa", "xml"],
	},
	response: {
		201: { type: "object", additionalProperties: true },
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const importarNotaFiscalPorChaveSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Importar NF-e de compra por chave de acesso",
	description:
		"Consulta a SEFAZ (consChNFe) pelo certificado da empresa, obtém o XML procNFe e cria rascunho de importação.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		additionalProperties: false,
		properties: {
			idempresa: { type: "string", description: "ID da empresa destino." },
			chaveNfe: {
				type: "string",
				description: "Chave de acesso NF-e com 44 dígitos.",
			},
			idplanocontas: {
				type: ["string", "null"],
				description: "Plano de contas para lançamentos financeiros.",
			},
			idcondicaopagto: {
				type: ["string", "null"],
				description: "Condição de pagamento para contas a pagar.",
			},
		},
		required: ["idempresa", "chaveNfe"],
	},
	response: {
		201: {
			type: "object",
			properties: {
				idRascunho: { type: "string" },
				urlRascunho: { type: "string" },
				chavenfe: { type: "string" },
			},
		},
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const buscarRascunhoImportacaoSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Buscar rascunho de importação",
	security: [{ bearerAuth: [] }],
	params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
	querystring: {
		type: "object",
		properties: { idempresa: { type: "string" } },
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const atualizarRascunhoImportacaoSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Atualizar cabeçalho do rascunho",
	security: [{ bearerAuth: [] }],
	params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const atualizarItemRascunhoImportacaoSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Atualizar item do rascunho",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: { id: { type: "string" }, idItem: { type: "string" } },
		required: ["id", "idItem"],
	},
	body: { type: "object", additionalProperties: true },
	response: {
		200: { type: "object", additionalProperties: true },
		400: respostaErro,
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const finalizarRascunhoImportacaoSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Finalizar rascunho de importação",
	security: [{ bearerAuth: [] }],
	params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			gerarCustos: { type: "boolean" },
			gerarFinanceiro: { type: "boolean" },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		400: respostaErro,
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const excluirRascunhoImportacaoSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Excluir rascunho de importação",
	security: [{ bearerAuth: [] }],
	params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
	querystring: {
		type: "object",
		properties: { idempresa: { type: "string" } },
		required: ["idempresa"],
	},
	response: {
		204: { type: "null" },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const listarRascunhosImportacaoSchema: FastifySchema = {
	tags: ["nota-fiscal"],
	summary: "Listar rascunhos de importação pendentes",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			page: { type: "number" },
			limit: { type: "number" },
		},
		required: ["idempresa"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

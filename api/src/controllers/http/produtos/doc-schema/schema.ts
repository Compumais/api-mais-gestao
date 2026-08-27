import type { FastifySchema } from "fastify";

const respostaErro = {
	type: "object",
	properties: {
		error: { type: "string" },
		code: { type: "string" },
	},
};

const propriedadesImpostosProdutoBody = {
	idcfopentrada: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "ID do CFOP padrão de entrada do produto",
	},
	idcfopsaida: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "ID do CFOP de saída NF do produto",
	},
	idcfopsaidanfce: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "ID do CFOP de saída ECF/NFC-e do produto",
	},
	idcest: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "ID do CEST vinculado ao produto",
	},
	idtaxauf: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "ID da taxa por UF vinculada ao produto (ECF/PDV)",
	},
	situacaotributariasnentrada: {
		anyOf: [{ type: "string", maxLength: 3 }, { type: "null" }],
		description: "CST/CSOSN de ICMS na entrada",
	},
	situacaotributaria: {
		anyOf: [{ type: "string", maxLength: 3 }, { type: "null" }],
		description: "CST ICMS na saída NFe (contribuinte)",
	},
	situacaotributariasn: {
		anyOf: [{ type: "string", maxLength: 3 }, { type: "null" }],
		description: "CSOSN ICMS na saída NFe (contribuinte)",
	},
	tributacaoespecial: {
		anyOf: [{ type: "string", maxLength: 7 }, { type: "null" }],
		description: "CST ICMS na saída CFe/NFC-e (não contribuinte)",
	},
	tributacaosn: {
		anyOf: [{ type: "string", maxLength: 3 }, { type: "null" }],
		description: "CSOSN ICMS na saída CFe/NFC-e (não contribuinte)",
	},
	cstpisentrada: {
		anyOf: [{ type: "string", maxLength: 2 }, { type: "null" }],
		description: "CST PIS na entrada",
	},
	cstcofinsentrada: {
		anyOf: [{ type: "string", maxLength: 2 }, { type: "null" }],
		description: "CST COFINS na entrada",
	},
	cstpis: {
		anyOf: [{ type: "string", maxLength: 2 }, { type: "null" }],
		description: "CST PIS na saída",
	},
	cstcofins: {
		anyOf: [{ type: "string", maxLength: 2 }, { type: "null" }],
		description: "CST COFINS na saída",
	},
	cstipientrada: {
		anyOf: [{ type: "string", maxLength: 3 }, { type: "null" }],
		description: "CST IPI na entrada",
	},
	cstipisaida: {
		anyOf: [{ type: "string", maxLength: 3 }, { type: "null" }],
		description: "CST IPI na saída",
	},
	cstibs: {
		anyOf: [{ type: "string", maxLength: 3 }, { type: "null" }],
		description: "CST IBS/CBS (grupo IBSCBS da NF-e)",
	},
	classtributariaibs: {
		anyOf: [{ type: "string", maxLength: 6 }, { type: "null" }],
		description: "Classificação tributária IBS/CBS (cClassTrib)",
	},
	percentualmva: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Percentual de MVA (Margem de Valor Agregado) do produto",
	},
	aliquotaicmsinterna: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota de ICMS interna",
	},
	aliquotaicmsdiferencialentrada: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota de ICMS diferencial na entrada",
	},
	aliquotareducaoicmsnfcesat: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota de redução de ICMS para NFC-e/SAT",
	},
	aliquotafcpnf: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota de FCP na nota fiscal",
	},
	ultimaaliquotaicmsst: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Última alíquota de ICMS ST",
	},
	ultimaaliquotafcpst: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Última alíquota de FCP ST",
	},
	aliquotapisentrada: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota de PIS na entrada",
	},
	aliquotaconfinsentrada: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota de COFINS na entrada",
	},
	aliquotapisconfinsentradapreco: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota PIS/COFINS na formação de preço de entrada",
	},
	aliquotapisconfinssaidapreco: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota PIS/COFINS na formação de preço de saída",
	},
	aliquotaiibs: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota IBS (%)",
	},
	aliquotacbs: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota CBS (%)",
	},
};

const propriedadesServicoProdutoBody = {
	itemrapido: {
		anyOf: [{ type: "number", enum: [0, 1] }, { type: "null" }],
		description: "Identifica se o serviço é item rápido",
	},
	podeserbrinde: {
		anyOf: [{ type: "number", enum: [0, 1] }, { type: "null" }],
		description: "Identifica se pode ser brinde",
	},
	inativo: {
		anyOf: [{ type: "number", enum: [0, 1] }, { type: "null" }],
		description: "0=Ativo, 1=Inativo",
	},
	nomeecf: {
		anyOf: [{ type: "string", maxLength: 120 }, { type: "null" }],
		description: "Nome PDV/ECF",
	},
	decimaispreco: {
		anyOf: [{ type: "number", minimum: 0, maximum: 6 }, { type: "null" }],
		description: "Casas decimais do preço",
	},
	codigolistalc11603: {
		anyOf: [{ type: "string", maxLength: 5 }, { type: "null" }],
		description: "Código da lista LC 116/03",
	},
	codigotributacaonacional: {
		anyOf: [{ type: "string", maxLength: 6 }, { type: "null" }],
		description: "Código de tributação nacional do ISSQN (6 dígitos)",
	},
	codigonbs: {
		anyOf: [{ type: "string", maxLength: 9 }, { type: "null" }],
		description: "Código NBS (9 dígitos)",
	},
	cicloposvenda: {
		anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
		description: "Ciclo em dias para notificar pós-venda",
	},
	idplanocontas: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "ID do plano de contas",
	},
	comissao: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Percentual de comissão",
	},
	comissaoavista: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Percentual de comissão à vista",
	},
	comissaoprazo: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Percentual de comissão a prazo",
	},
	percentualcomissaoquitacao: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Percentual de comissão na quitação",
	},
	situacaoiss: {
		anyOf: [{ type: "string", maxLength: 7 }, { type: "null" }],
		description: "Situação/tributação do ISS",
	},
	aliquotaiss: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota ISS",
	},
	exigibilidadeiss: {
		anyOf: [{ type: "string", maxLength: 1 }, { type: "null" }],
		description: "Exigibilidade do ISS (NFS-e)",
	},
	processoisencaoiss: {
		anyOf: [{ type: "string", maxLength: 60 }, { type: "null" }],
		description: "Processo de isenção ISS",
	},
	incentivofiscal: {
		anyOf: [{ type: "number", enum: [0, 1] }, { type: "null" }],
		description: "Possui incentivo fiscal",
	},
	codigomunicipalservico: {
		anyOf: [{ type: "string", maxLength: 20 }, { type: "null" }],
		description: "Código municipal do serviço",
	},
	tipoimpressaogourmet: {
		anyOf: [{ type: "string", maxLength: 40 }, { type: "null" }],
		description: "Tipo de impressão no Gourmet",
	},
	idcfopsaidaexterna: {
		anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
		description: "CFOP externa de saída",
	},
	aliquotapis: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota PIS",
	},
	aliquotacofins: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "Alíquota COFINS",
	},
};

const propriedadesImpostosProdutoResposta = {
	...propriedadesImpostosProdutoBody,
	cstpisentrada: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "CST PIS na entrada",
	},
	cstcofinsentrada: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "CST COFINS na entrada",
	},
	cstpis: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "CST PIS na saída",
	},
	cstcofins: {
		anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
		description: "CST COFINS na saída",
	},
	cstipientrada: {
		anyOf: [{ type: "string" }, { type: "null" }],
		description: "CST IPI na entrada",
	},
	cstipisaida: {
		anyOf: [{ type: "string" }, { type: "null" }],
		description: "CST IPI na saída",
	},
};

const propriedadesProdutoResposta = {
	id: { type: "string", format: "uuid" },
	idempresa: { type: "string", format: "uuid" },
	codigo: { type: "number", nullable: true },
	ean: { anyOf: [{ type: "string" }, { type: "null" }] },
	referencia: { anyOf: [{ type: "string" }, { type: "null" }] },
	nome: { type: "string" },
	descricao: { type: "string" },
	idunidademedida: { type: "string", format: "uuid", nullable: true },
	fornecedor: { anyOf: [{ type: "string", format: "uuid" }, { type: "null" }] },
	idgrupo: { type: "string", format: "uuid", nullable: true },
	idgrupogourmet: { type: "string", format: "uuid", nullable: true },
	preco: { type: "string", nullable: true },
	tipo: { type: "string", enum: ["P", "S"], nullable: true },
	iat: {
		anyOf: [{ type: "string", enum: ["A", "T"] }, { type: "null" }],
	},
	ippt: { type: "string", enum: ["P", "T"], nullable: true },
	origem: { type: "number", minimum: 0, maximum: 8 },
	ncm: { type: "string", nullable: true },
	observacoes: { anyOf: [{ type: "string" }, { type: "null" }] },
	enviamobile: { type: "number", enum: [0, 1], nullable: true },
	espizza: {
		type: "number",
		enum: [0, 1],
		nullable: true,
		description: "1=produto pizza (habilita venda meio a meio no PDV/POS)",
	},
	exportaBalanca: {
		type: "number",
		enum: [0, 1],
		nullable: true,
		description: "1=inclui o produto na exportação TXTitens da balança MGV",
	},
	diasValidade: {
		type: "number",
		nullable: true,
		description:
			"Validade na balança: 0 usa o padrão da exportação; 1 a 990 imprime datas; 998 não imprime; 999 solicita na balança",
	},
	controlalote: {
		type: "number",
		enum: [0, 1],
		nullable: true,
		description: "1=controla lote no estoque e na NF-e",
	},
	controlavalidade: {
		type: "number",
		enum: [0, 1],
		nullable: true,
		description: "1=exige data de validade no lote",
	},
	quantidadepadrao: { type: "number", nullable: true },
	quantidademinima: { type: "number", nullable: true },
	quantidademaxima: { type: "number", nullable: true },
	estoque: { type: "number", nullable: true },
	cestCodigo: {
		anyOf: [{ type: "string", pattern: "^\\d{7}$" }, { type: "null" }],
		description: "Código CEST (7 dígitos) resolvido a partir de idcest",
	},
	unidademedida: { anyOf: [{ type: "string" }, { type: "null" }] },
	...propriedadesImpostosProdutoResposta,
	...propriedadesServicoProdutoBody,
};

export const criarProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Criar produto",
	description: "Cria um novo produto na empresa do usuário autenticado.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			codigo: { type: "number" },
			ean: { anyOf: [{ type: "number" }, { type: "null" }] },
			referencia: { anyOf: [{ type: "string" }, { type: "null" }] },
			nome: { type: "string" },
			idunidademedida: { type: "string" },
			fornecedor: { anyOf: [{ type: "string" }, { type: "null" }] },
			idgrupo: { type: "string" },
			idgrupogourmet: { anyOf: [{ type: "string" }, { type: "null" }] },
			preco: { type: "string" },
			tipo: { type: "string", enum: ["P", "S"] },
			iat: {
				anyOf: [{ type: "string", enum: ["A", "T"] }, { type: "null" }],
			},
			ippt: { type: "string", enum: ["P", "T"] },
			origem: {
				type: "number",
				minimum: 0,
				maximum: 8,
				description: "Origem da mercadoria (0 a 8, tabela NF-e)",
			},
			ncm: { type: "string" },
			observacoes: { anyOf: [{ type: "string" }, { type: "null" }] },
			enviamobile: { type: "number", enum: [0, 1] },
			espizza: { type: "number", enum: [0, 1] },
			exportaBalanca: { type: "number", enum: [0, 1] },
			diasValidade: { type: "number" },
			controlalote: { type: "number", enum: [0, 1] },
			controlavalidade: { type: "number", enum: [0, 1] },
			quantidadepadrao: { type: "number" },
			quantidademinima: { anyOf: [{ type: "number" }, { type: "null" }] },
			quantidademaxima: { anyOf: [{ type: "number" }, { type: "null" }] },
			estoque: { type: "number", minimum: 0 },
			...propriedadesImpostosProdutoBody,
			...propriedadesServicoProdutoBody,
		},
		required: ["idempresa", "codigo", "nome", "idunidademedida", "preco"],
	},
	response: {
		201: {
			type: "object",
			description: "Produto criado com sucesso",
			properties: propriedadesProdutoResposta,
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

export const listarProdutosSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Listar produtos",
	description: "Lista produtos da empresa com paginação e filtros.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string" },
			nome: { type: "string" },
			q: { type: "string" },
			inativo: { type: "number" },
			tipo: { type: "string", enum: ["P", "S"] },
			codigo: { type: "string" },
			ean: { type: "string" },
			referencia: { type: "string" },
			ncm: { type: "string" },
			unidademedida: { type: "string" },
			tipoproduto: { type: "string" },
			fornecedor: { type: "string" },
			preco: { type: "string" },
			custoaquisicao: { type: "string" },
			datacadastro: { type: "string" },
			ordenarPor: { type: "string" },
			ordem: { type: "string", enum: ["asc", "desc"] },
			page: { type: "number", default: 1 },
			limit: { type: "number", default: 10 },
		},
		required: ["idempresa"],
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
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const buscarProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Buscar produto por ID",
	description: "Retorna os dados de um produto, incluindo tributação padrão.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
		},
		required: ["id"],
	},
	response: {
		200: {
			type: "object",
			description: "Dados do produto",
			properties: propriedadesProdutoResposta,
		},
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const atualizarProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Atualizar produto",
	description:
		"Atualiza os dados de um produto, incluindo campos fiscais opcionais.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string", format: "uuid" },
		},
		required: ["id"],
	},
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
		},
		required: ["idempresa"],
	},
	body: {
		type: "object",
		properties: {
			codigo: { type: "number" },
			ean: {
				anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
			},
			referencia: { anyOf: [{ type: "string" }, { type: "null" }] },
			nome: { type: "string" },
			idunidademedida: { type: "string", format: "uuid" },
			fornecedor: {
				anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
			},
			idgrupo: { type: "string", format: "uuid" },
			idgrupogourmet: {
				anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
			},
			preco: { anyOf: [{ type: "string" }, { type: "number" }] },
			tipo: { type: "string", enum: ["P", "S"] },
			iat: {
				anyOf: [{ type: "string", enum: ["A", "T"] }, { type: "null" }],
			},
			ippt: { type: "string", enum: ["P", "T"] },
			origem: { type: "number", minimum: 0, maximum: 8 },
			ncm: { type: "string" },
			observacoes: { anyOf: [{ type: "string" }, { type: "null" }] },
			enviamobile: { type: "number", enum: [0, 1] },
			espizza: { type: "number", enum: [0, 1] },
			exportaBalanca: { type: "number", enum: [0, 1] },
			diasValidade: { type: "number" },
			controlalote: { type: "number", enum: [0, 1] },
			controlavalidade: { type: "number", enum: [0, 1] },
			quantidadepadrao: { type: "number" },
			quantidademinima: { anyOf: [{ type: "number" }, { type: "null" }] },
			quantidademaxima: { anyOf: [{ type: "number" }, { type: "null" }] },
			estoque: { type: "number", minimum: 0 },
			...propriedadesImpostosProdutoBody,
			...propriedadesServicoProdutoBody,
		},
	},
	response: {
		200: {
			type: "object",
			description: "Produto atualizado com sucesso",
			properties: propriedadesProdutoResposta,
		},
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const inativarProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Inativar ou reativar produto",
	description: "Altera o status de inativação do produto.",
	security: [{ bearerAuth: [] }],
	params: {
		type: "object",
		properties: {
			id: { type: "string" },
		},
		required: ["id"],
	},
	body: {
		type: "object",
		properties: {
			inativo: { type: "number", enum: [0, 1] },
		},
		required: ["inativo"],
	},
	response: {
		200: { type: "object", additionalProperties: true },
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const tributacaoPorCfopSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Sugerir tributação de saída por CFOP",
	description:
		"Retorna CST/CSOSN e CFOP ECF sugeridos a partir do cadastro do CFOP de saída.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			idempresa: { type: "string", format: "uuid" },
			idcfop: { type: "string", format: "uuid" },
		},
		required: ["idempresa", "idcfop"],
	},
	response: {
		200: {
			type: "object",
			properties: {
				idcfopsaida: { type: "string", format: "uuid", nullable: true },
				idcfopsaidanfce: { type: "string", format: "uuid", nullable: true },
				situacaotributaria: { type: "string", nullable: true },
				situacaotributariasn: { type: "string", nullable: true },
				tributacaoespecial: { type: "string", nullable: true },
				tributacaosn: { type: "string", nullable: true },
				cfopvendaecf: { type: "number", nullable: true },
			},
		},
		401: respostaErro,
		403: respostaErro,
		404: respostaErro,
		500: respostaErro,
	},
};

export const exportarProdutosMgvSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Exportar produtos para balança Toledo MGV",
	description:
		"Gera o arquivo TXTitens.txt (layout ITENSMGV versão 3) com os produtos ativos da empresa.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
			departamentoPadrao: {
				type: "number",
				minimum: 1,
				maximum: 99,
				description:
					"Departamento MGV usado quando o produto não tem departamento (1 a 99)",
			},
			diasValidade: {
				type: "number",
				description: "Dias de validade (0 a 990, 998 ou 999)",
			},
			apenasPesaveis: {
				type: "boolean",
				description: "Se verdadeiro, exporta somente produtos pesáveis",
			},
		},
		required: ["idempresa"],
	},
	response: {
		200: {
			type: "string",
			description: "Arquivo TXTitens.txt (ISO-8859-1)",
		},
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const excluirProdutoSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Excluir produto",
	description: "Remove permanentemente um produto.",
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
		404: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

const corpoImportacaoProdutos = {
	type: "object",
	properties: {
		idempresa: {
			type: "string",
			format: "uuid",
			description: "ID da empresa",
		},
		formato: {
			type: "string",
			enum: ["csv", "xlsx"],
			description: "Formato do arquivo",
		},
		conteudo: {
			type: "string",
			description: "Conteúdo do arquivo: texto para CSV ou base64 para XLSX",
		},
		nomeArquivo: {
			type: "string",
			nullable: true,
			description: "Nome do arquivo original (para validar a extensão)",
		},
	},
	required: ["idempresa", "formato", "conteudo"],
};

export const previewImportacaoProdutosSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Preview da importação de produtos",
	description:
		"Valida um arquivo CSV ou XLSX de produtos e retorna os registros encontrados, a ação (criar ou atualizar) e os erros de validação, sem persistir nada.",
	security: [{ bearerAuth: [] }],
	body: corpoImportacaoProdutos,
	response: {
		200: {
			type: "object",
			description: "Resultado da validação do arquivo",
			properties: {
				totalProdutos: { type: "number" },
				totalCriar: { type: "number" },
				totalAtualizar: { type: "number" },
				totalErros: { type: "number" },
				errosGerais: { type: "array", items: { type: "string" } },
				produtos: {
					type: "array",
					items: {
						type: "object",
						properties: {
							linha: { type: "number" },
							codigo: { type: "number", nullable: true },
							nome: { type: "string" },
							grupo: { type: "string" },
							unidade: { type: "string" },
							preco: { type: "string", nullable: true },
							acao: { type: "string", enum: ["criar", "atualizar"] },
							erros: { type: "array", items: { type: "string" } },
						},
					},
				},
			},
		},
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const importarProdutosSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Importar produtos",
	description:
		"Cria ou atualiza produtos a partir de um arquivo CSV ou XLSX. Produtos existentes são identificados pelo código ou EAN.",
	security: [{ bearerAuth: [] }],
	body: corpoImportacaoProdutos,
	response: {
		200: {
			type: "object",
			description: "Produtos importados com sucesso",
			properties: {
				totalImportados: { type: "number" },
				totalCriados: { type: "number" },
				totalAtualizados: { type: "number" },
			},
		},
		400: respostaErro,
		401: respostaErro,
		403: respostaErro,
		500: respostaErro,
	},
};

export const alterarProdutosEmMassaSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Alterar produtos em massa",
	description:
		"Aplica os mesmos valores parciais a todos os produtos selecionados da empresa. Somente as chaves enviadas em campos são atualizadas.",
	security: [{ bearerAuth: [] }],
	body: {
		type: "object",
		properties: {
			idempresa: {
				type: "string",
				format: "uuid",
				description: "ID da empresa",
			},
			ids: {
				type: "array",
				minItems: 1,
				maxItems: 500,
				items: { type: "string", format: "uuid" },
				description: "IDs dos produtos a alterar",
			},
			campos: {
				type: "object",
				description:
					"Campos parciais a aplicar. Chaves omitidas não são alteradas.",
				properties: {
					idgrupo: {
						anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
					},
					idunidademedida: { type: "string", format: "uuid" },
					preco: { anyOf: [{ type: "string" }, { type: "number" }] },
					custoaquisicao: {
						anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
					},
					origem: { type: "number", minimum: 0, maximum: 8 },
					ncm: { anyOf: [{ type: "string", maxLength: 10 }, { type: "null" }] },
					ippt: {
						anyOf: [{ type: "string", enum: ["P", "T"] }, { type: "null" }],
					},
					inativo: {
						anyOf: [{ type: "number", enum: [0, 1] }, { type: "null" }],
					},
					tipoproduto: {
						anyOf: [{ type: "string", maxLength: 2 }, { type: "null" }],
					},
					aliquotapis: {
						anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
					},
					aliquotacofins: {
						anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
					},
					...propriedadesImpostosProdutoBody,
				},
			},
		},
		required: ["idempresa", "ids", "campos"],
	},
	response: {
		200: {
			type: "object",
			description: "Resultado da alteração em massa",
			properties: {
				atualizados: { type: "number" },
				erros: { type: "number" },
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

export const templateProdutosSchema: FastifySchema = {
	tags: ["produtos"],
	summary: "Baixar modelo de importação de produtos",
	description:
		"Retorna um arquivo modelo (CSV ou XLSX) com as colunas de cadastro, MVA e alíquotas e uma linha de exemplo.",
	security: [{ bearerAuth: [] }],
	querystring: {
		type: "object",
		properties: {
			formato: {
				type: "string",
				enum: ["csv", "xlsx"],
				default: "csv",
				description: "Formato do arquivo modelo",
			},
		},
	},
	response: {
		401: respostaErro,
		500: respostaErro,
	},
};

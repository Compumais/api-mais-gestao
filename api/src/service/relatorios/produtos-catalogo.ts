export const TIPOS_RELATORIO_PRODUTO = [
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
] as const;

export type TipoRelatorioProduto = (typeof TIPOS_RELATORIO_PRODUTO)[number];

export type TipoColunaRelatorioProduto =
	| "texto"
	| "numero"
	| "moeda"
	| "percentual"
	| "data"
	| "datahora"
	| "status";

export type ColunaRelatorioProduto = {
	chave: string;
	label: string;
	tipo?: TipoColunaRelatorioProduto;
};

export const CATALOGO_RELATORIO_PRODUTO: Record<
	TipoRelatorioProduto,
	{ titulo: string; colunas: ColunaRelatorioProduto[] }
> = {
	qualidade: {
		titulo: "Qualidade do cadastro",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "situacao", label: "Situação", tipo: "status" },
			{ chave: "pendencias", label: "Pendências" },
			{ chave: "preco", label: "Preço", tipo: "moeda" },
			{ chave: "estoque", label: "Estoque", tipo: "numero" },
		],
	},
	cadastro: {
		titulo: "Cadastro",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "ean", label: "EAN" },
			{ chave: "grupo", label: "Grupo" },
			{ chave: "fornecedor", label: "Fornecedor" },
			{ chave: "situacao", label: "Situação", tipo: "status" },
			{ chave: "preco", label: "Preço", tipo: "moeda" },
			{ chave: "ncm", label: "NCM" },
			{ chave: "datacadastro", label: "Cadastro", tipo: "datahora" },
		],
	},
	ean: {
		titulo: "EAN e identificação",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "ean", label: "EAN" },
			{ chave: "eantributavel", label: "EAN tributável" },
			{ chave: "referencia", label: "Referência" },
			{ chave: "situacao", label: "Situação", tipo: "status" },
		],
	},
	precos: {
		titulo: "Preços e margens",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "grupo", label: "Grupo" },
			{ chave: "preco", label: "Preço", tipo: "moeda" },
			{ chave: "custo", label: "Custo", tipo: "moeda" },
			{ chave: "margem", label: "Margem (%)", tipo: "percentual" },
		],
	},
	estoque: {
		titulo: "Estoque",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "grupo", label: "Grupo" },
			{ chave: "estoque", label: "Operacional", tipo: "numero" },
			{ chave: "estoquefiscal", label: "Fiscal", tipo: "numero" },
			{ chave: "minimo", label: "Mínimo", tipo: "numero" },
			{
				chave: "ultimaMovimentacao",
				label: "Última movimentação",
				tipo: "data",
			},
		],
	},
	fiscal: {
		titulo: "Parâmetros fiscais",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "ncm", label: "NCM" },
			{ chave: "cest", label: "CEST" },
			{ chave: "cst", label: "CST" },
			{ chave: "csosn", label: "CSOSN" },
			{ chave: "origem", label: "Origem" },
			{ chave: "situacao", label: "Situação", tipo: "status" },
		],
	},
	comercial: {
		titulo: "Comercial",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "quantidade", label: "Qtd. vendida", tipo: "numero" },
			{ chave: "valor", label: "Valor", tipo: "moeda" },
			{ chave: "custo", label: "Custo", tipo: "moeda" },
			{ chave: "margem", label: "Margem (%)", tipo: "percentual" },
		],
	},
	compras: {
		titulo: "Compras",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "fornecedor", label: "Fornecedor" },
			{ chave: "quantidade", label: "Quantidade", tipo: "numero" },
			{ chave: "valor", label: "Valor", tipo: "moeda" },
			{ chave: "ultimaCompra", label: "Última compra", tipo: "data" },
		],
	},
	movimentacoes: {
		titulo: "Movimentações de produtos",
		colunas: [
			{ chave: "data", label: "Data", tipo: "datahora" },
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "origem", label: "Origem" },
			{ chave: "tipoEstoque", label: "Estoque" },
			{ chave: "entrada", label: "Entrada", tipo: "numero" },
			{ chave: "saida", label: "Saída", tipo: "numero" },
		],
	},
	unidades: {
		titulo: "Unidades e conversões",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "unidade", label: "Unidade" },
			{ chave: "fator", label: "Fator", tipo: "numero" },
			{ chave: "situacao", label: "Situação", tipo: "status" },
		],
	},
	composicao: {
		titulo: "Composição",
		colunas: [
			{ chave: "codigo", label: "Código", tipo: "numero" },
			{ chave: "nome", label: "Produto" },
			{ chave: "componentes", label: "Componentes", tipo: "numero" },
			{ chave: "producaoNaVenda", label: "Produz na venda", tipo: "status" },
			{ chave: "situacao", label: "Situação", tipo: "status" },
		],
	},
	auditoria: {
		titulo: "Auditoria",
		colunas: [
			{ chave: "data", label: "Data", tipo: "datahora" },
			{ chave: "acao", label: "Ação" },
			{ chave: "usuario", label: "Usuário" },
			{ chave: "produto", label: "Produto" },
			{ chave: "idrecurso", label: "Recurso" },
		],
	},
};

import type { TipoRelatorioProduto } from "@/services/relatorios-produtos.service";

export type CampoFiltroRelatorio =
	| "q"
	| "dataInicio"
	| "dataFim"
	| "situacao"
	| "grupo"
	| "fornecedor"
	| "pendencia"
	| "diasSemMovimento"
	| "margemMin"
	| "margemMax"
	| "origem"
	| "tipoEstoque";

export interface ConfiguracaoRelatorioProduto {
	tipo: TipoRelatorioProduto;
	titulo: string;
	descricao: string;
	filtros: CampoFiltroRelatorio[];
	opcoesPendencia?: Array<{ value: string; label: string }>;
}

const PENDENCIAS_CADASTRO = [
	{ value: "ean", label: "Sem EAN" },
	{ value: "ncm", label: "Sem NCM" },
	{ value: "cest", label: "Sem CEST" },
	{ value: "preco", label: "Sem preço" },
	{ value: "fornecedor", label: "Sem fornecedor" },
	{ value: "grupo", label: "Sem grupo" },
	{ value: "tributacao", label: "Sem tributação" },
	{ value: "foto", label: "Sem foto" },
	{ value: "duplicado", label: "Código ou EAN duplicado" },
] as const;

export const RELATORIOS_PRODUTOS: ConfiguracaoRelatorioProduto[] = [
	{
		tipo: "qualidade",
		titulo: "Qualidade do cadastro",
		descricao: "Visão consolidada das pendências e da completude do catálogo.",
		filtros: ["q", "situacao", "grupo", "pendencia"],
		opcoesPendencia: [
			...PENDENCIAS_CADASTRO,
			{ value: "margem_baixa", label: "Margem abaixo de 10%" },
			{ value: "estoque_negativo", label: "Estoque negativo" },
		],
	},
	{
		tipo: "cadastro",
		titulo: "Cadastro",
		descricao: "Dados gerais e parâmetros cadastrais dos produtos.",
		filtros: ["q", "situacao", "grupo", "fornecedor", "pendencia"],
		opcoesPendencia: [...PENDENCIAS_CADASTRO],
	},
	{
		tipo: "ean",
		titulo: "EAN e identificação",
		descricao: "Identificadores comerciais e pendências de EAN.",
		filtros: ["q", "situacao", "pendencia"],
		opcoesPendencia: [
			{ value: "ean", label: "Sem EAN" },
			{ value: "duplicado", label: "EAN duplicado" },
		],
	},
	{
		tipo: "precos",
		titulo: "Preços e margens",
		descricao: "Comparativo consolidado de preços, custos e margens.",
		filtros: ["q", "grupo", "fornecedor", "margemMin", "margemMax"],
	},
	{
		tipo: "estoque",
		titulo: "Estoque",
		descricao: "Posição e indicadores de produtos sem movimentação.",
		filtros: ["q", "grupo", "pendencia", "diasSemMovimento"],
		opcoesPendencia: [
			{ value: "abaixo_minimo", label: "Abaixo do mínimo" },
			{ value: "sem_estoque", label: "Sem estoque" },
			{ value: "negativo", label: "Estoque negativo" },
		],
	},
	{
		tipo: "fiscal",
		titulo: "Parâmetros fiscais",
		descricao:
			"Auditoria dos parâmetros cadastrais fiscais, conforme retorno do backend.",
		filtros: ["q", "situacao", "grupo", "pendencia"],
		opcoesPendencia: [
			{ value: "ncm", label: "Sem NCM" },
			{ value: "cest", label: "Sem CEST" },
			{ value: "tributacao", label: "Sem tributação" },
		],
	},
	{
		tipo: "comercial",
		titulo: "Comercial",
		descricao: "Desempenho comercial consolidado por produto e período.",
		filtros: ["q", "dataInicio", "dataFim", "margemMin", "margemMax"],
	},
	{
		tipo: "compras",
		titulo: "Compras",
		descricao: "Compras consolidadas por produto, fornecedor e período.",
		filtros: ["q", "dataInicio", "dataFim", "fornecedor"],
	},
	{
		tipo: "movimentacoes",
		titulo: "Movimentações de produtos",
		descricao: "Kardex consolidado com entradas e saídas de estoque.",
		filtros: ["q", "dataInicio", "dataFim", "origem", "tipoEstoque"],
	},
	{
		tipo: "unidades",
		titulo: "Unidades e conversões",
		descricao: "Unidades de medida e parâmetros de conversão cadastrados.",
		filtros: ["q", "situacao", "pendencia"],
		opcoesPendencia: [{ value: "fator_invalido", label: "Fator inválido" }],
	},
	{
		tipo: "composicao",
		titulo: "Composição",
		descricao: "Composição de produtos e vínculos cadastrais consolidados.",
		filtros: ["q", "situacao", "pendencia"],
		opcoesPendencia: [{ value: "sem_itens", label: "Sem componentes" }],
	},
	{
		tipo: "auditoria",
		titulo: "Auditoria",
		descricao: "Alterações e eventos relacionados ao cadastro de produtos.",
		filtros: ["q", "dataInicio", "dataFim"],
	},
];

export const RELATORIO_PRODUTO_POR_TIPO = Object.fromEntries(
	RELATORIOS_PRODUTOS.map((relatorio) => [relatorio.tipo, relatorio]),
) as Record<TipoRelatorioProduto, ConfiguracaoRelatorioProduto>;

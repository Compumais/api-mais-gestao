export const PRESENCA_CONSUMIDOR_CFOP = [
	{ value: 0, label: "Não se aplica" },
	{ value: 1, label: "Presencial" },
	{ value: 2, label: "Não presencial pela internet" },
	{ value: 3, label: "Não presencial teleatendimento" },
	{ value: 5, label: "Operação presencial, fora do estabelecimento" },
	{ value: 9, label: "Não presencial outros" },
] as const;

export const FINALIDADE_EMISSAO_NFE_CFOP = [
	{ value: 1, label: "Normal" },
	{ value: 2, label: "Complementar" },
	{ value: 3, label: "Ajuste" },
	{ value: 5, label: "Ajuste com itens" },
	{ value: 4, label: "Devolução de venda" },
	{ value: 6, label: "Devolução de compra" },
	{ value: 7, label: "Importação do PDV" },
	{ value: 8, label: "Transferência de crédito de ICMS" },
	{ value: 9, label: "Crédito de ICMS" },
] as const;

export const TIPO_VALOR_PRECO_CFOP = [
	{ value: 0, label: "Preço de venda" },
	{ value: 1, label: "Custo" },
	{ value: 2, label: "Custo médio" },
	{ value: 3, label: "Custo de aquisição" },
] as const;

export const INTEGRACAO_FINANCEIRO_CFOP = [
	{ value: 0, label: "Sem integração" },
	{ value: 1, label: "Contas a receber" },
	{ value: 2, label: "Contas a pagar" },
] as const;

export const TIPO_CONSIGNACAO_CFOP = [
	{ value: "nenhuma", label: "Não se aplica" },
	{ value: "entrada", label: "Entrada" },
	{ value: "saida", label: "Saída" },
] as const;

export type TipoConsignacaoCfop =
	(typeof TIPO_CONSIGNACAO_CFOP)[number]["value"];

export const CHECKBOXES_GERAL_CFOP = [
	{ name: "consideravenda", label: "Considerar venda/compra" },
	{
		name: "considerarservico",
		label: "Permite a digitação de serviços na nota fiscal",
	},
	{
		name: "digitarimpostositemnotasaida",
		label: "Digitar impostos no item na nota fiscal de saída",
	},
	{
		name: "calcularimpostoaproximado",
		label: "Calcular impostos aprox. (De olho no imposto)",
	},
	{ name: "possuiincentivosfiscais", label: "Possui incentivos fiscais" },
	{ name: "consideracustomedio", label: "Calcular custo médio" },
	{
		name: "informartotaismanualmente",
		label: "Manipular os impostos na nota fiscal de entrada",
	},
	{ name: "permitenotasemvalor", label: "Nota fiscal sem valor" },
	{ name: "consumidorfinal", label: "Consumidor final" },
	{ name: "permitirbaixarlotevencido", label: "Permitir baixa lote vencido" },
	{ name: "naobaixarestoque", label: "Não baixar estoque" },
	{
		name: "digitartotalitemmanualmente",
		label: "Digitar valor do item pelo valor total",
	},
	{
		name: "considerainscricaoestadualsub",
		label: "Considerar inscrição estadual substituto",
	},
	{
		name: "exigirdocumentoreferenciado",
		label: "Exigir documento fiscal referenciado",
	},
	{ name: "registrarproducaovenda", label: "Registrar a produção na venda" },
	{
		name: "considerarproduto",
		label: "Permitir a digitação de produtos na nota fiscal",
	},
	{
		name: "naoconsiderapiscofinsproduto",
		label: "Não considerar PIS e COFINS do item",
	},
	{
		name: "naoconsiderarvlnotafiscalitem",
		label: "Não considerar valor do item da nota fiscal",
	},
	{
		name: "utilizartodasoperacoes",
		label: "Utilizar em todos os locais de destino",
	},
	{
		name: "interestadualdestmesmauf",
		label: "Permitir CFOP interestadual para destinatário da mesma UF",
	},
] as const;

export const ABAS_NATUREZA_CFOP = [
	{ value: "geral", label: "Geral", enabled: true },
	{
		value: "icms",
		label: "ICMS",
		enabled: false,
		subabas: [
			{ value: "icms-geral", label: "Geral" },
			{ value: "icms-st", label: "ICMS ST" },
			{ value: "icms-estados", label: "Estados" },
			{ value: "icms-zona-franca", label: "Zona Franca/ALC" },
		],
	},
	{ value: "ipi", label: "IPI", enabled: false },
	{ value: "pis-cofins", label: "PIS/COFINS", enabled: false },
	{ value: "retencao", label: "Retenção", enabled: false },
	{ value: "servico", label: "Serviço", enabled: false },
	{ value: "importacao", label: "Importação", enabled: false },
	{ value: "funrural", label: "Funrural", enabled: false },
	{ value: "sped", label: "SPED", enabled: false },
	{ value: "sintegra", label: "Sintegra", enabled: false },
	{
		value: "situacoes-especiais",
		label: "Situações especiais",
		enabled: false,
	},
	{ value: "observacoes", label: "Observações", enabled: false },
	{ value: "cte", label: "CT-e", enabled: false },
] as const;

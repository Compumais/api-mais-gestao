/** 0 = único centro; 1 = rateio manual; 2 = rateio por critério salvo */
export const TIPO_RATEIO_CENTRO_CUSTO = {
	NAO_APLICA: null as null,
	UNICO: 0,
	RATEIO_MANUAL: 1,
	RATEIO_CRITERIO: 2,
} as const;

export const ORIGEM_TIPO_APROPRIACAO = {
	FINANCEIRO: "financeiro",
	FINANCEIRO_LANCAMENTO: "financeiro_lancamento",
	CONTA_CORRENTE_LANCAMENTO: "conta_corrente_lancamento",
	NOTA_FISCAL: "nota_fiscal",
	ORDEM_SERVICO: "ordem_servico",
	MANUAL: "manual",
} as const;

export type OrigemTipoApropriacao =
	(typeof ORIGEM_TIPO_APROPRIACAO)[keyof typeof ORIGEM_TIPO_APROPRIACAO];

export const REGIME_APROPRIACAO = {
	COMPETENCIA: "competencia",
	CAIXA: "caixa",
} as const;

export type RegimeApropriacao =
	(typeof REGIME_APROPRIACAO)[keyof typeof REGIME_APROPRIACAO];

export const TIPO_GESTAO_CENTRO_CUSTO = [
	"ADM",
	"COM",
	"OPE",
	"PRJ",
	"OUT",
] as const;

export type TipoGestaoCentroCusto = (typeof TIPO_GESTAO_CENTRO_CUSTO)[number];

export const TIPO_PARAMETRO_CRITERIO_RATEIO = [
	"percentual",
	"colaboradores",
	"area",
	"horas",
	"manual",
] as const;

export const TOLERANCIA_ARREDONDAMENTO_APROPRIACAO = 0.01;

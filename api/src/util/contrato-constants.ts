export const TIPO_ORIGEM_FINANCEIRO_CONTRATO = 5;
export const TIPO_ORIGEM_FINANCEIRO_LOCACAO = 6;

export const FLUXO_FATURAMENTO_CONTRATO = {
	NFSE_CR_BOLETO_REMESSA: 1,
	CR_BOLETO_REMESSA: 2,
	SO_CR: 3,
} as const;

export type FluxoFaturamentoContrato =
	(typeof FLUXO_FATURAMENTO_CONTRATO)[keyof typeof FLUXO_FATURAMENTO_CONTRATO];

export const SITUACAO_CONTRATO = {
	ATIVO: "ativo",
	SUSPENSO: "suspenso",
	ENCERRADO: "encerrado",
} as const;

export const STATUS_LOTE_FATURAMENTO = {
	RASCUNHO: "rascunho",
	PROCESSANDO: "processando",
	CONCLUIDO: "concluido",
	CONCLUIDO_PARCIAL: "concluido_parcial",
	CANCELADO: "cancelado",
} as const;

export const STATUS_COBRANCA_FATURAMENTO = {
	ELEGIVEL: "elegivel",
	PROCESSANDO: "processando",
	AGUARDANDO_AUTORIZACAO_NFSE: "aguardando_autorizacao_nfse",
	NFSE_AUTORIZADA: "nfse_autorizada",
	TITULO_CRIADO: "titulo_criado",
	BOLETO_GERADO: "boleto_gerado",
	REMESSA_INCLUIDA: "remessa_incluida",
	CONCLUIDO: "concluido",
	ERRO: "erro",
} as const;

export const STATUS_REMESSA_BANCARIA = {
	ABERTA: "aberta",
	GERADA: "gerada",
	ENVIADA: "enviada",
	CANCELADA: "cancelada",
} as const;

export const PERIODICIDADE_CONTRATO = {
	MENSAL: "mensal",
} as const;

export const REGRA_COMPETENCIA_CONTRATO = {
	MES_ATUAL: "mes_atual",
	MES_SEGUINTE: "mes_seguinte",
} as const;

export const STATUS_RASCUNHO_IMPORTACAO = 99;
export const STATUS_NF_CONFIRMADA = 1;
/** Cancelamento interno de NF de compra (estorna estoque/financeiro) */
export const STATUS_NF_COMPRA_CANCELADA = 2;
/** Origem do título financeiro gerado a partir de nota fiscal de compra */
export const TIPO_ORIGEM_FINANCEIRO_NF_COMPRA = 2;
/** Origem do título financeiro gerado a partir de nota fiscal de venda */
export const TIPO_ORIGEM_FINANCEIRO_NF_VENDA = 3;

/**
 * Status que não bloqueiam nova entrada da mesma chave NF-e
 * (rascunho de importação ou compra já cancelada/estornada).
 */
export const STATUS_NF_QUE_NAO_BLOQUEIAM_CHAVE = [
	STATUS_RASCUNHO_IMPORTACAO,
	STATUS_NF_COMPRA_CANCELADA,
] as const;

/** Indica se a nota (por status) impede reimportar a mesma chave. */
export function statusNotaFiscalBloqueiaChaveDuplicada(
	status: number | null | undefined,
): boolean {
	if (status === STATUS_RASCUNHO_IMPORTACAO) return false;
	if (status === STATUS_NF_COMPRA_CANCELADA) return false;
	return true;
}

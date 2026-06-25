/** 0 = operacional (real), 1 = fiscal, 2 = ambos */
export const TIPO_ESTOQUE = {
	OPERACIONAL: 0,
	FISCAL: 1,
	AMBOS: 2,
} as const;

export type TipoEstoque = (typeof TIPO_ESTOQUE)[keyof typeof TIPO_ESTOQUE];

export const TIPO_DOCUMENTO_ESTOQUE = {
	PDV: 0,
	NOTA_FISCAL: 1,
	ACERTO: 2,
} as const;

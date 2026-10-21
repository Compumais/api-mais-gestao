export const TIPO_GESTAO_CENTRO_CUSTO = [
	{ value: "ADM", label: "Administrativo" },
	{ value: "COM", label: "Comercial" },
	{ value: "OPE", label: "Operacional" },
	{ value: "PRJ", label: "Projeto" },
	{ value: "OUT", label: "Outros" },
] as const;

export const REGIME_APROPRIACAO_OPTIONS = [
	{ value: "competencia", label: "Competência" },
	{ value: "caixa", label: "Caixa" },
] as const;

export type RegimeApropriacao =
	(typeof REGIME_APROPRIACAO_OPTIONS)[number]["value"];

export const LAYOUT_CNAB = {
	CNAB240: "cnab240",
	CNAB400: "cnab400",
} as const;

export type LayoutCnab = (typeof LAYOUT_CNAB)[keyof typeof LAYOUT_CNAB];

export const LAYOUTS_CNAB_VALIDOS = Object.values(LAYOUT_CNAB);

export function normalizarLayoutCnab(
	valor: string | null | undefined,
	padrao: LayoutCnab = LAYOUT_CNAB.CNAB240,
): LayoutCnab {
	const normalizado = (valor ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
	if (normalizado === "cnab240" || normalizado === "240") {
		return LAYOUT_CNAB.CNAB240;
	}
	if (normalizado === "cnab400" || normalizado === "400") {
		return LAYOUT_CNAB.CNAB400;
	}
	return padrao;
}

export function resolverLayoutRemessa(conta: {
	layoutarquivoremessa?: string | null;
}): LayoutCnab {
	return normalizarLayoutCnab(conta.layoutarquivoremessa);
}

export function resolverLayoutRetorno(conta: {
	layoutarquivoretorno?: string | null;
	layoutarquivoremessa?: string | null;
}): LayoutCnab {
	if (conta.layoutarquivoretorno?.trim()) {
		return normalizarLayoutCnab(conta.layoutarquivoretorno);
	}
	return resolverLayoutRemessa(conta);
}

export const STATUS_RETORNO_BANCARIO = {
	IMPORTADO: "importado",
	PROCESSADO: "processado",
	PROCESSADO_PARCIAL: "processado_parcial",
	ERRO: "erro",
} as const;

export const STATUS_RETORNO_ITEM = {
	PENDENTE: "pendente",
	PROCESSADO: "processado",
	IGNORADO: "ignorado",
	ERRO: "erro",
} as const;

/** Códigos FEBRABAN/CNAB comuns de liquidação (segmento T/U ou detalhe 400). */
export const OCORRENCIAS_LIQUIDACAO = new Set([
	"06",
	"17",
	"15",
	"09",
	"10",
]);

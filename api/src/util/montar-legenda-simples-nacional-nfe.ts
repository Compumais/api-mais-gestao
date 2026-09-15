export const LEGENDA_SIMPLES_COM_CREDITO =
	"DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL";

export const LEGENDA_SIMPLES_SEM_CREDITO_ICMS =
	"DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE ICMS";

export type ItemLegendaSimplesNfe = {
	csosn?: string | null;
	cst?: string | null;
};

function resolverCsosnItem(item: ItemLegendaSimplesNfe): string {
	const csosn = item.csosn?.trim() ?? "";
	if (csosn) return csosn;

	const cst = item.cst?.trim() ?? "";
	if (/^[1259]\d{2}$/.test(cst)) return cst;

	return "";
}

export function empresaUsaSimplesNacional(crt: number | null | undefined): boolean {
	return crt === 1 || crt === 2 || crt === 4;
}

export function itemTemCreditoSn(csosn: string): boolean {
	return csosn === "101" || csosn === "201";
}

export function montarLegendaSimplesNacionalNfe(params: {
	crt: number | null | undefined;
	itens: ItemLegendaSimplesNfe[];
}): string | null {
	if (!empresaUsaSimplesNacional(params.crt)) {
		return null;
	}

	let temCreditoSn = false;
	for (const item of params.itens) {
		const csosn = resolverCsosnItem(item);
		if (itemTemCreditoSn(csosn)) {
			temCreditoSn = true;
			break;
		}
	}

	return temCreditoSn ? LEGENDA_SIMPLES_COM_CREDITO : LEGENDA_SIMPLES_SEM_CREDITO_ICMS;
}

export function textoJaContemLegendaSimples(texto?: string | null): boolean {
	if (!texto?.trim()) return false;
	return texto.toUpperCase().includes("SIMPLES NACIONAL");
}

export function anexarLegendaSimplesInformacoesAdicionais(
	informacoesAdicionais: string | undefined,
	params: {
		crt: number | null | undefined;
		itens: ItemLegendaSimplesNfe[];
	},
): string | undefined {
	const base = informacoesAdicionais?.trim() ?? "";
	if (textoJaContemLegendaSimples(base)) {
		return base || undefined;
	}

	const legenda = montarLegendaSimplesNacionalNfe(params);
	if (!legenda) return base || undefined;

	if (!base) return legenda;
	return `${base.replace(/[.;]\s*$/, "")}. ${legenda}`;
}

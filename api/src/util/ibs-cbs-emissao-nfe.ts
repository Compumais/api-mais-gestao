import {
	normalizarClassTribIbsCbs,
	normalizarCstIbsCbs,
	validarCstEClassificacaoIbsCbs,
	type DocumentoIbsCbs,
} from "@/util/catalogo-ibs-cbs.js";

export type IbsCbsItemPayload = {
	cst: string;
	cClassTrib: string;
	aliquotaIbs?: number;
	aliquotaCbs?: number;
};

/** CRT 1/2/4 = Simples Nacional (piloto IBS/CBS não envia o grupo). */
export function crtOmiteIbsCbs(crt?: number | string | null): boolean {
	if (crt == null || crt === "") return false;
	const codigo = typeof crt === "number" ? crt : Number(String(crt).trim());
	return codigo === 1 || codigo === 2 || codigo === 4;
}

export function montarIbsCbsItemPayload(params: {
	cst?: string | null;
	cClassTrib?: string | null;
	aliquotaIbs?: number | null;
	aliquotaCbs?: number | null;
}): IbsCbsItemPayload | undefined {
	const cst = normalizarCstIbsCbs(params.cst);
	const cClassTrib = normalizarClassTribIbsCbs(params.cClassTrib);
	if (!cst || !cClassTrib) {
		return undefined;
	}

	const resultado: IbsCbsItemPayload = { cst, cClassTrib };
	if (params.aliquotaIbs != null && Number.isFinite(params.aliquotaIbs)) {
		resultado.aliquotaIbs = params.aliquotaIbs;
	}
	if (params.aliquotaCbs != null && Number.isFinite(params.aliquotaCbs)) {
		resultado.aliquotaCbs = params.aliquotaCbs;
	}
	return resultado;
}

export function aplicarIbsCbsPorRegimeCrt<T extends { ibsCbs?: IbsCbsItemPayload }>(
	itens: T[],
	crt?: number | string | null,
): T[] {
	if (!crtOmiteIbsCbs(crt)) {
		return itens;
	}
	return itens.map((item) => {
		if (!item.ibsCbs) return item;
		const { ibsCbs: _omitido, ...resto } = item;
		return resto as T;
	});
}

export function validarIbsCbsItensEmissao(
	itens: Array<{ ibsCbs?: IbsCbsItemPayload; descricao?: string }>,
	documento: DocumentoIbsCbs,
	crt?: number | string | null,
): string[] {
	if (crtOmiteIbsCbs(crt)) {
		return [];
	}

	const pendencias: string[] = [];
	for (const [indice, item] of itens.entries()) {
		const ibs = item.ibsCbs;
		if (!ibs) continue;
		const validacao = validarCstEClassificacaoIbsCbs(
			ibs.cst,
			ibs.cClassTrib,
			documento,
		);
		if (!validacao.ok) {
			const rotulo = item.descricao?.trim() || `item ${indice + 1}`;
			pendencias.push(`${rotulo}: ${validacao.message}`);
		}
	}
	return pendencias;
}

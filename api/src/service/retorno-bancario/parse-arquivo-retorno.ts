import { parseArquivoCnab240 } from "@/service/retorno-bancario/parse-cnab240.js";
import { parseArquivoCnab400 } from "@/service/retorno-bancario/parse-cnab400.js";
import type { ResultadoParseRetorno } from "@/service/retorno-bancario/tipos.js";
import {
	LAYOUT_CNAB,
	type LayoutCnab,
	normalizarLayoutCnab,
} from "@/util/cnab-layouts.js";

function detectarLayout(conteudo: string): LayoutCnab {
	const primeira = conteudo
		.replace(/\r\n/g, "\n")
		.split("\n")
		.find((l) => l.trim().length > 0);
	if (!primeira) return LAYOUT_CNAB.CNAB240;
	if (primeira.length >= 400 || primeira.startsWith("0") || primeira.startsWith("02RETORNO")) {
		if (primeira.length >= 400 || /^[029]/.test(primeira)) {
			if (primeira.length >= 240 && primeira.length < 400 && primeira.slice(7, 8) === "0") {
				return LAYOUT_CNAB.CNAB240;
			}
			if (primeira.length >= 400) return LAYOUT_CNAB.CNAB400;
		}
	}
	if (primeira.length >= 240) return LAYOUT_CNAB.CNAB240;
	return LAYOUT_CNAB.CNAB400;
}

export function parseArquivoRetorno(
	conteudo: string,
	layoutPreferido?: string | null,
): ResultadoParseRetorno {
	const layout = layoutPreferido
		? normalizarLayoutCnab(layoutPreferido)
		: detectarLayout(conteudo);

	if (layout === LAYOUT_CNAB.CNAB400) {
		const resultado = parseArquivoCnab400(conteudo);
		if (resultado.itens.length > 0) return resultado;
		const fallback = parseArquivoCnab240(conteudo);
		if (fallback.itens.length > 0) return fallback;
		return resultado;
	}

	const resultado = parseArquivoCnab240(conteudo);
	if (resultado.itens.length > 0) return resultado;
	return parseArquivoCnab400(conteudo);
}

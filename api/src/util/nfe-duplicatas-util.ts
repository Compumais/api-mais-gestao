import type { NFeXmlParsed } from "@/util/nfe-xml-parser.js";

export type DuplicataNFeXml = {
	numero?: string | undefined;
	vencimento?: string | undefined;
	valor?: string | undefined;
};

export function extrairDuplicatasNFe(
	infNFe: Record<string, unknown>,
): DuplicataNFeXml[] {
	const cobr = infNFe.cobr as Record<string, unknown> | undefined;
	if (!cobr) return [];

	const dupRaw = cobr.dup;
	const lista = Array.isArray(dupRaw) ? dupRaw : dupRaw ? [dupRaw] : [];
	const duplicatas: DuplicataNFeXml[] = [];

	for (const dup of lista) {
		const registro = dup as Record<string, unknown>;
		const vencimento = registro.dVenc ? String(registro.dVenc).trim() : undefined;
		const valor = registro.vDup ? String(registro.vDup).trim() : undefined;
		const numero = registro.nDup ? String(registro.nDup).trim() : undefined;

		if (!vencimento && !valor) continue;

		duplicatas.push({ numero, vencimento, valor });
	}

	return duplicatas;
}

export function extrairDuplicatasDoXmlParseado(
	dados: NFeXmlParsed,
): DuplicataNFeXml[] {
	return dados.duplicatas ?? [];
}

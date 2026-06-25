/**
 * Normalização de Inscrição Estadual para XML NF-e (emitente e destinatário).
 * A SEFAZ rejeita IE com pontuação e exige coerência com indIEDest.
 */

export type IndIeDestNfe = 1 | 2 | 9;

export function resolverIndIeDestNfe(params: {
	inscricaoestadual?: string | null;
	indiedest?: number | null;
	cnpjcpf?: string | null;
}): IndIeDestNfe {
	const { inscricaoestadual, indiedest, cnpjcpf } = params;

	const ieTexto = inscricaoestadual?.trim().toUpperCase() ?? "";
	const ieIsento = ieTexto === "ISENTO" || ieTexto === "ISENTA";
	const ieDigitos = ieTexto.replace(/\D/g, "");

	if (indiedest === 2 || ieIsento) {
		return 2;
	}

	if (indiedest === 9) {
		return 9;
	}

	if (indiedest === 1 || ieDigitos.length > 0) {
		return 1;
	}

	const doc = cnpjcpf?.replace(/\D/g, "") ?? "";
	if (doc.length === 11) {
		return 9;
	}

	return 9;
}

export function normalizarIeParaNfe(
	inscricaoestadual?: string | null,
	indIEDest?: number | null,
): string | undefined {
	if (indIEDest === 2 || indIEDest === 9) {
		return undefined;
	}

	const texto = inscricaoestadual?.trim() ?? "";
	if (!texto) return undefined;

	const upper = texto.toUpperCase();
	if (upper === "ISENTO" || upper === "ISENTA") {
		return "ISENTO";
	}

	const digitos = texto.replace(/\D/g, "");
	return digitos || undefined;
}

export function montarIeEmitenteNfe(
	inscricaoestadual?: string | null,
): string {
	const texto = inscricaoestadual?.trim() ?? "";
	if (!texto) return "";

	const upper = texto.toUpperCase();
	if (upper === "ISENTO" || upper === "ISENTA") {
		return "ISENTO";
	}

	return texto.replace(/\D/g, "");
}

/** Em homologação o XML usa CNPJ fictício; IE real gera rejeição SEFAZ. */
export function ajustarDestinatarioAmbienteNfe(
	destinatario: { ie?: string; indIEDest?: number } | undefined,
	ambiente: number,
): typeof destinatario {
	if (!destinatario || ambiente !== 2) {
		return destinatario;
	}

	return {
		...destinatario,
		ie: undefined,
		indIEDest: 9,
	};
}

/**
 * Helpers de matching e normalização da parametrização de tributos
 * (CFOP/CST/CSOSN do XML do fornecedor → tributação de saída no produto).
 */

export function normalizarCodigoCfop(
	cfop?: string | null | undefined,
): string | undefined {
	if (!cfop) return undefined;
	const digitos = cfop.replace(/\D/g, "");
	return digitos.length > 0 ? digitos : undefined;
}

export function extrairCstOuCsosn(situacao?: string | undefined): {
	cst?: string | undefined;
	csosn?: string | undefined;
} {
	if (!situacao) return { cst: undefined, csosn: undefined };
	const valor = situacao.trim();
	if (!valor) return { cst: undefined, csosn: undefined };

	if (
		valor.length === 3 &&
		(valor.startsWith("1") ||
			valor.startsWith("2") ||
			valor.startsWith("5") ||
			valor.startsWith("9"))
	) {
		return { cst: undefined, csosn: valor };
	}

	return { cst: valor, csosn: undefined };
}

/** Compara CST de entrada (XML vs regra), normalizando origem quando necessário. */
export function cstsEntradaCoincidem(
	cstXml?: string | undefined,
	cstRegra?: string | undefined,
	ignorarPrimeiroDigito?: boolean | number | null,
): boolean {
	if (!cstXml || !cstRegra) return false;

	const xml = cstXml.replace(/\D/g, "").trim();
	const regra = cstRegra.replace(/\D/g, "").trim();
	if (!xml || !regra) return false;
	if (xml === regra) return true;

	const forcarUltimos2 =
		Boolean(ignorarPrimeiroDigito) || xml.length !== regra.length;

	if (forcarUltimos2) {
		return xml.slice(-2).padStart(2, "0") === regra.slice(-2).padStart(2, "0");
	}

	return false;
}

export function csosnsEntradaCoincidem(
	csosnXml?: string | undefined,
	csosnRegra?: string | undefined,
): boolean {
	if (!csosnXml || !csosnRegra) return false;
	return csosnXml.trim() === csosnRegra.trim();
}

export type CriteriosMatchParametrizacao = {
	cstentrada?: string | undefined;
	csosnentrada?: string | undefined;
	ncm?: string | undefined;
	uf?: string | undefined;
};

export type RegraMatchParametrizacao = {
	cstentrada?: string | null;
	csosnentrada?: string | null;
	ncm?: string | null;
	uf?: string | null;
	ignorarprimeirodigitocst?: number | boolean | null;
};

/**
 * Avalia se a regra casa com os dados do XML.
 * Filtros CST/CSOSN só exigem match quando o XML trouxe o respectivo código
 * (regimes diferentes: XML com CSOSN não invalida regra genérica só com CST vazio no XML).
 */
export function regraParametrizacaoCasaComNota(
	regra: RegraMatchParametrizacao,
	criterios: CriteriosMatchParametrizacao,
): boolean {
	const ufNota = criterios.uf?.trim().toUpperCase() || undefined;
	const ufRegra = regra.uf?.trim().toUpperCase() || undefined;

	if (ufNota && ufRegra && ufRegra !== ufNota) {
		return false;
	}

	const cstRegra = regra.cstentrada?.trim() || undefined;
	const csosnRegra = regra.csosnentrada?.trim() || undefined;

	if (cstRegra && criterios.cstentrada) {
		if (
			!cstsEntradaCoincidem(
				criterios.cstentrada,
				cstRegra,
				regra.ignorarprimeirodigitocst,
			)
		) {
			return false;
		}
	}
	// Se a regra tem CST mas o XML só trouxe CSOSN (ou nada), não descarta —
	// permite regras genéricas por CFOP/NCM quando o regime da nota difere.

	if (csosnRegra && criterios.csosnentrada) {
		if (!csosnsEntradaCoincidem(criterios.csosnentrada, csosnRegra)) {
			return false;
		}
	}

	const ncmRegra = regra.ncm?.trim() || undefined;
	if (ncmRegra) {
		const ncmNota = criterios.ncm?.trim() || undefined;
		if (!ncmNota || ncmRegra !== ncmNota) {
			return false;
		}
	}

	return true;
}

export function scoreEspecificidadeRegra(regra: RegraMatchParametrizacao): number {
	return (
		(regra.ncm?.trim() ? 8 : 0) +
		(regra.cstentrada?.trim() ? 4 : 0) +
		(regra.csosnentrada?.trim() ? 2 : 0) +
		(regra.uf?.trim() ? 1 : 0)
	);
}

/** CST de saída: "0" → "00"; 1 dígito preenchido com zero à esquerda. */
export function normalizarCstSaida(
	cst?: string | null | undefined,
): string | undefined {
	if (!cst) return undefined;
	const digitos = cst.replace(/\D/g, "").trim();
	if (!digitos) return undefined;
	if (digitos.length === 1) return digitos.padStart(2, "0");
	if (digitos.length === 2) return digitos;
	return digitos.slice(0, 3);
}

export function normalizarCsosnSaida(
	csosn?: string | null | undefined,
): string | undefined {
	if (!csosn) return undefined;
	const digitos = csosn.replace(/\D/g, "").trim();
	if (!digitos) return undefined;
	return digitos.padStart(3, "0").slice(0, 3);
}

/** Campo vazio ou placeholder inválido ("0" sozinho) — pode receber sugestão. */
export function campoTributacaoAusenteOuInvalido(
	valor?: string | null | undefined,
): boolean {
	const texto = valor?.trim();
	if (!texto) return true;
	if (texto === "0") return true;
	return false;
}

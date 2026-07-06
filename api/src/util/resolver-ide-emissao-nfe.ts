import {
	ID_DEST_NFE,
	IND_PRES_NFE_PADRAO,
	isIndPresNfeValido,
	type IndPresNfe,
} from "@/constants/ind-pres-nfe.js";

const PAISES_BRASIL = new Set(["br", "brasil", "1058"]);

function normalizarUf(uf?: string | null): string {
	return uf?.trim().toUpperCase() ?? "";
}

function normalizarPais(pais?: string | null): string {
	return pais?.trim().toLowerCase() ?? "";
}

export function destinatarioEhExterior(params: {
	paisDestinatario?: string | null;
	ufDestinatario?: string | null;
}): boolean {
	const uf = normalizarUf(params.ufDestinatario);
	if (uf === "EX") return true;

	const pais = normalizarPais(params.paisDestinatario);
	if (!pais) return false;

	return !PAISES_BRASIL.has(pais);
}

export function resolverIdDestNfe(params: {
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	paisDestinatario?: string | null;
}): number {
	if (
		destinatarioEhExterior({
			paisDestinatario: params.paisDestinatario,
			ufDestinatario: params.ufDestinatario,
		})
	) {
		return ID_DEST_NFE.EXTERIOR;
	}

	const ufEmitente = normalizarUf(params.ufEmitente);
	const ufDestinatario = normalizarUf(params.ufDestinatario);

	if (!ufDestinatario) {
		return ID_DEST_NFE.INTERNA;
	}

	if (!ufEmitente || ufEmitente === ufDestinatario) {
		return ID_DEST_NFE.INTERNA;
	}

	return ID_DEST_NFE.INTERESTADUAL;
}

export function resolverIndPresNfe(params: {
	indPres?: number | null;
	finNFe?: number | null;
}): IndPresNfe {
	const finNFe = params.finNFe ?? 1;
	if (finNFe === 2 || finNFe === 3) {
		return 0;
	}

	if (params.indPres != null && isIndPresNfeValido(params.indPres)) {
		return params.indPres;
	}

	return IND_PRES_NFE_PADRAO;
}

export function resolverIdeEmissaoNfe(params: {
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	paisDestinatario?: string | null;
	indPres?: number | null;
	finNFe?: number | null;
}): { idDest: number; indPres: IndPresNfe; indFinal: 1 } {
	return {
		idDest: resolverIdDestNfe({
			ufEmitente: params.ufEmitente,
			ufDestinatario: params.ufDestinatario,
			paisDestinatario: params.paisDestinatario,
		}),
		indPres: resolverIndPresNfe({
			indPres: params.indPres,
			finNFe: params.finNFe,
		}),
		indFinal: 1,
	};
}

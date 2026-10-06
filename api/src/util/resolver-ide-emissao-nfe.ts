import {
	ID_DEST_NFE,
	IND_PRES_NFE_PADRAO,
	type IndPresNfe,
	isIndPresNfeValido,
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

/** indPres 1: comprador presente no estabelecimento (retirada no local). */
const IND_PRES_PRESENCIAL_ESTABELECIMENTO = 1;

export function resolverIdDestNfe(params: {
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	ufLocalEntrega?: string | null;
	paisDestinatario?: string | null;
	/**
	 * Quando 1, a operação ocorre na UF do emitente mesmo que o destinatário
	 * esteja cadastrado em outra UF. Entrega explícita em outra UF continua
	 * interestadual. Os demais indPres seguem a comparação de UF.
	 */
	indPres?: number | null;
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
	const ufEntrega = normalizarUf(params.ufLocalEntrega);
	const ufDestinatario = normalizarUf(params.ufDestinatario);

	if (params.indPres === IND_PRES_PRESENCIAL_ESTABELECIMENTO) {
		if (ufEntrega && ufEmitente && ufEntrega !== ufEmitente) {
			return ID_DEST_NFE.INTERESTADUAL;
		}
		return ID_DEST_NFE.INTERNA;
	}

	const ufOperacao = ufEntrega || ufDestinatario;

	if (!ufOperacao) {
		return ID_DEST_NFE.INTERNA;
	}

	if (!ufEmitente || ufEmitente === ufOperacao) {
		return ID_DEST_NFE.INTERNA;
	}

	return ID_DEST_NFE.INTERESTADUAL;
}

/**
 * Na venda presencial no estabelecimento, o endereço cadastral do destinatário
 * não é local de entrega. Enviá-lo no grupo entrega com UF diferente da do
 * emitente faz a SEFAZ tratar a operação como interestadual.
 */
export function omitirEnderecoEntregaCadastralPresencial(params: {
	indPres?: number | null;
	informarManual?: boolean;
	ufEmitente?: string | null;
	ufEndereco?: string | null;
}): boolean {
	if (
		params.indPres !== IND_PRES_PRESENCIAL_ESTABELECIMENTO ||
		params.informarManual
	) {
		return false;
	}

	const ufEmitente = normalizarUf(params.ufEmitente);
	const ufEndereco = normalizarUf(params.ufEndereco);
	if (ufEmitente.length !== 2 || ufEndereco.length !== 2) return false;

	return ufEmitente !== ufEndereco;
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
	ufLocalEntrega?: string | null;
	paisDestinatario?: string | null;
	indPres?: number | null;
	finNFe?: number | null;
}): { idDest: number; indPres: IndPresNfe; indFinal: 1 } {
	const indPres = resolverIndPresNfe({
		indPres: params.indPres,
		finNFe: params.finNFe,
	});

	return {
		idDest: resolverIdDestNfe({
			ufEmitente: params.ufEmitente,
			ufDestinatario: params.ufDestinatario,
			ufLocalEntrega: params.ufLocalEntrega,
			paisDestinatario: params.paisDestinatario,
			indPres,
		}),
		indPres,
		indFinal: 1,
	};
}

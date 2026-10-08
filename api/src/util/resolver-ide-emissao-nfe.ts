import {
	ID_DEST_NFE,
	IND_PRES_NFE_PADRAO,
	type IndPresNfe,
	isIdDestNfeValido,
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

/**
 * Contribuinte do ICMS (indIEDest=1). Isento (2) e não contribuinte (9)
 * não são contribuinte para fins de classificação fiscal.
 */
export function destinatarioContribuinteIcms(params: {
	indIEDest?: number | null;
	contribuinteIcms?: boolean | null;
}): boolean {
	if (params.contribuinteIcms != null) return params.contribuinteIcms;
	return params.indIEDest === 1;
}

/** Entrega explícita em UF diferente da do emitente. */
export function temEntregaExplicitaOutraUf(params: {
	ufEmitente?: string | null;
	ufLocalEntrega?: string | null;
}): boolean {
	const ufEmitente = normalizarUf(params.ufEmitente);
	const ufEntrega = normalizarUf(params.ufLocalEntrega);
	return (
		ufEmitente.length === 2 &&
		ufEntrega.length === 2 &&
		ufEmitente !== ufEntrega
	);
}

/**
 * Sem ocorrência de transporte: modFrete=9 e valor de frete zerado.
 * Frete informado (mesmo com modFrete 9) deixa de ser retirada.
 */
export function operacaoSemFrete(params: {
	modFrete?: number | null;
	valorFrete?: number | null;
}): boolean {
	if ((params.valorFrete ?? 0) > 0) return false;
	// Omitido segue o padrão da NF-e e da tela: 9 — sem ocorrência de transporte.
	return (params.modFrete ?? 9) === 9;
}

/**
 * Retirada no estabelecimento que a SEFAZ aceita como operação interna
 * mesmo com contribuinte de outra UF: indPres=1, modFrete=9 e sem entrega fora.
 */
export function ehRetiradaPresencialSemFrete(params: {
	indPres?: number | null;
	modFrete?: number | null;
	valorFrete?: number | null;
	ufEmitente?: string | null;
	ufLocalEntrega?: string | null;
}): boolean {
	if (params.indPres !== IND_PRES_PRESENCIAL_ESTABELECIMENTO) return false;
	if (
		temEntregaExplicitaOutraUf({
			ufEmitente: params.ufEmitente,
			ufLocalEntrega: params.ufLocalEntrega,
		})
	) {
		return false;
	}
	return operacaoSemFrete(params);
}

export function resolverIdDestNfe(params: {
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	ufLocalEntrega?: string | null;
	paisDestinatario?: string | null;
	/**
	 * Contribuinte de outra UF só fica em operação interna com indPres=1 e
	 * modFrete=9 (sem frete). Qualquer frete torna a operação interestadual.
	 */
	indPres?: number | null;
	/** 9 = sem ocorrência de transporte. Outros valores implicam frete. */
	modFrete?: number | null;
	valorFrete?: number | null;
	/** 1 = contribuinte ICMS; 2 = isento; 9 = não contribuinte. */
	indIEDest?: number | null;
	contribuinteIcms?: boolean | null;
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

	if (temEntregaExplicitaOutraUf({ ufEmitente, ufLocalEntrega: ufEntrega })) {
		return ID_DEST_NFE.INTERESTADUAL;
	}

	const ufOperacao = ufEntrega || ufDestinatario;
	const ufDiferente =
		ufEmitente.length === 2 &&
		ufOperacao.length === 2 &&
		ufEmitente !== ufOperacao;
	const contribuinte = destinatarioContribuinteIcms(params);

	if (ufDiferente && contribuinte) {
		return ehRetiradaPresencialSemFrete({
			indPres: params.indPres,
			modFrete: params.modFrete,
			valorFrete: params.valorFrete,
			ufEmitente,
			ufLocalEntrega: ufEntrega,
		})
			? ID_DEST_NFE.INTERNA
			: ID_DEST_NFE.INTERESTADUAL;
	}

	if (
		params.indPres === IND_PRES_PRESENCIAL_ESTABELECIMENTO &&
		!temEntregaExplicitaOutraUf({ ufEmitente, ufLocalEntrega: ufEntrega })
	) {
		return ID_DEST_NFE.INTERNA;
	}


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
	modFrete?: number | null;
	valorFrete?: number | null;
	indIEDest?: number | null;
	contribuinteIcms?: boolean | null;
	/** Quando informado e válido, prevalece sobre o cálculo automático. */
	idDest?: number | null;
}): { idDest: number; indPres: IndPresNfe; indFinal: 1 } {
	const indPres = resolverIndPresNfe({
		indPres: params.indPres,
		finNFe: params.finNFe,
	});

	const idDestCalculado = resolverIdDestNfe({
		ufEmitente: params.ufEmitente,
		ufDestinatario: params.ufDestinatario,
		ufLocalEntrega: params.ufLocalEntrega,
		paisDestinatario: params.paisDestinatario,
		indPres,
		modFrete: params.modFrete,
		valorFrete: params.valorFrete,
		indIEDest: params.indIEDest,
		contribuinteIcms: params.contribuinteIcms,
	});

	const idDest =
		params.idDest != null && isIdDestNfeValido(params.idDest)
			? params.idDest
			: idDestCalculado;

	return {
		idDest,
		indPres,
		indFinal: 1,
	};
}

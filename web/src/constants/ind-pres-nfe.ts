export const IND_PRES_NFE_VALORES = [0, 1, 2, 3, 4, 5, 9] as const;

export type IndPresNfe = (typeof IND_PRES_NFE_VALORES)[number];

export const IND_PRES_NFE_PADRAO: IndPresNfe = 1;

export const IND_PRES_NFE_LABELS: Record<IndPresNfe, string> = {
	0: "Não se aplica (complementar, ajuste)",
	1: "Operação presencial",
	2: "Não presencial — Internet",
	3: "Não presencial — Teleatendimento",
	4: "NFC-e com entrega em domicílio",
	5: "Presencial, fora do estabelecimento",
	9: "Não presencial — outros",
};

export const ID_DEST_NFE = {
	INTERNA: 1,
	INTERESTADUAL: 2,
	EXTERIOR: 3,
} as const;

export const ID_DEST_NFE_VALORES = [
	ID_DEST_NFE.INTERNA,
	ID_DEST_NFE.INTERESTADUAL,
	ID_DEST_NFE.EXTERIOR,
] as const;

export type IdDestNfe = (typeof ID_DEST_NFE_VALORES)[number];

export const ID_DEST_NFE_LABELS: Record<number, string> = {
	[ID_DEST_NFE.INTERNA]: "Operação interna",
	[ID_DEST_NFE.INTERESTADUAL]: "Operação interestadual",
	[ID_DEST_NFE.EXTERIOR]: "Operação com exterior",
};

export function isIndPresNfeValido(valor: number): valor is IndPresNfe {
	return (IND_PRES_NFE_VALORES as readonly number[]).includes(valor);
}

export function isIdDestNfeValido(valor: number): valor is IdDestNfe {
	return (ID_DEST_NFE_VALORES as readonly number[]).includes(valor);
}

export const OPCOES_IND_PRES_NFE = IND_PRES_NFE_VALORES.map((valor) => ({
	value: String(valor),
	label: `${valor} — ${IND_PRES_NFE_LABELS[valor]}`,
}));

export const OPCOES_ID_DEST_NFE = ID_DEST_NFE_VALORES.map((valor) => ({
	value: String(valor),
	label: `${valor} — ${ID_DEST_NFE_LABELS[valor]}`,
}));

export function resolverIdDestNfePreview(params: {
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	ufLocalEntrega?: string | null;
	paisDestinatario?: string | null;
	indPres?: number | null;
	/** Mantido por compatibilidade; o pickup presencial não depende de indIEDest. */
	indIEDest?: number | null;
}): { idDest: number; label: string } | null {
	const ufEmitente = params.ufEmitente?.trim().toUpperCase() ?? "";
	const ufEntrega = params.ufLocalEntrega?.trim().toUpperCase() ?? "";
	const ufDestinatario = params.ufDestinatario?.trim().toUpperCase() ?? "";
	const pais = params.paisDestinatario?.trim().toLowerCase() ?? "";
	const ufReferencia = ufEntrega || ufDestinatario;

	if (!ufReferencia && !pais) {
		return null;
	}

	if (
		ufDestinatario === "EX" ||
		ufEntrega === "EX" ||
		(pais && !["br", "brasil", "1058"].includes(pais))
	) {
		return {
			idDest: 3,
			label: ID_DEST_NFE_LABELS[3] ?? "Operação com exterior",
		};
	}

	// Pickup presencial: retirada no estabelecimento → operação interna (CFOP 5xxx),
	// mesmo com destinatário contribuinte cadastrado em outra UF.
	if (params.indPres === 1) {
		if (ufEntrega && ufEmitente && ufEntrega !== ufEmitente) {
			return {
				idDest: 2,
				label: ID_DEST_NFE_LABELS[2] ?? "Operação interestadual",
			};
		}
		return { idDest: 1, label: ID_DEST_NFE_LABELS[1] ?? "Operação interna" };
	}

	if (!ufReferencia || !ufEmitente || ufEmitente === ufReferencia) {
		return { idDest: 1, label: ID_DEST_NFE_LABELS[1] ?? "Operação interna" };
	}

	return {
		idDest: 2,
		label: ID_DEST_NFE_LABELS[2] ?? "Operação interestadual",
	};
}

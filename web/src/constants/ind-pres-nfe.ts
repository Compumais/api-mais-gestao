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

export const ID_DEST_NFE_LABELS: Record<number, string> = {
	1: "Operação interna (mesmo estado)",
	2: "Operação interestadual",
	3: "Operação com exterior",
};

export function isIndPresNfeValido(valor: number): valor is IndPresNfe {
	return (IND_PRES_NFE_VALORES as readonly number[]).includes(valor);
}

export const OPCOES_IND_PRES_NFE = IND_PRES_NFE_VALORES.map((valor) => ({
	value: String(valor),
	label: `${valor} — ${IND_PRES_NFE_LABELS[valor]}`,
}));

export function resolverIdDestNfePreview(params: {
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	paisDestinatario?: string | null;
}): { idDest: number; label: string } | null {
	const ufEmitente = params.ufEmitente?.trim().toUpperCase() ?? "";
	const ufDestinatario = params.ufDestinatario?.trim().toUpperCase() ?? "";
	const pais = params.paisDestinatario?.trim().toLowerCase() ?? "";

	if (!ufDestinatario && !pais) {
		return null;
	}

	if (ufDestinatario === "EX" || (pais && !["br", "brasil", "1058"].includes(pais))) {
		return { idDest: 3, label: ID_DEST_NFE_LABELS[3] ?? "Operação com exterior" };
	}

	if (!ufDestinatario || !ufEmitente || ufEmitente === ufDestinatario) {
		return { idDest: 1, label: ID_DEST_NFE_LABELS[1] ?? "Operação interna" };
	}

	return { idDest: 2, label: ID_DEST_NFE_LABELS[2] ?? "Operação interestadual" };
}

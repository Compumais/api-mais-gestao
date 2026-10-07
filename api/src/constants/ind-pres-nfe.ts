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

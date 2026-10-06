const CSTAT_DUPLICIDADE = new Set(["204", "539"]);

export function cStatIndicaDuplicidadeNfce(
	cStat?: string | number | null,
): boolean {
	return CSTAT_DUPLICIDADE.has(String(cStat ?? "").trim());
}

export function extrairChaveDuplicidadeNfce(
	texto?: string | null,
): string | null {
	if (!texto) return null;
	const rotulada = texto.match(/chNFe[:\s]*(\d{44})/i);
	if (rotulada?.[1]) return rotulada[1];
	const colchetes = texto.match(/\[(\d{44})\]/);
	if (colchetes?.[1]) return colchetes[1];
	const solta = texto.match(/(?<!\d)(\d{44})(?!\d)/);
	return solta?.[1] ?? null;
}

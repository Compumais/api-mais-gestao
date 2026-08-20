export const CST_COM_ST = new Set(["10", "30", "60", "70"]);
export const CSOSN_COM_ST = new Set(["201", "202", "203", "500"]);

export function normalizarCfop(cfop?: string | null): string {
	return cfop?.replace(/\D/g, "") ?? "";
}

export function cfopIndicaSt(cfop?: string | null): boolean {
	const codigo = normalizarCfop(cfop);
	return codigo.startsWith("54") || codigo.startsWith("64");
}

export function itemIndicaSt(item: {
	cfop?: string | null;
	cst?: string | null;
	csosn?: string | null;
	baseIcmsSt?: number | null;
	valorIcmsSt?: number | null;
}): boolean {
	const cst = item.cst?.replace(/\D/g, "") ?? "";
	const csosn = item.csosn?.replace(/\D/g, "") ?? "";
	if (CST_COM_ST.has(cst) || CSOSN_COM_ST.has(csosn)) return true;
	if (cfopIndicaSt(item.cfop)) return true;
	return (item.baseIcmsSt ?? 0) > 0 || (item.valorIcmsSt ?? 0) > 0;
}

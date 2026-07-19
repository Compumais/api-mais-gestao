/**
 * Datas/horários fiscais no fuso America/Sao_Paulo (UTC−3, sem horário de verão desde 2019).
 */

export const FUSO_BRASILIA = "America/Sao_Paulo";

function parte(
	parts: Intl.DateTimeFormatPart[],
	tipo: Intl.DateTimeFormatPartTypes,
): string {
	return parts.find((p) => p.type === tipo)?.value ?? "";
}

/**
 * Instantâneo atual em Brasília no formato exigido pelo XSD do `dhEmi` (NF-e/NFC-e):
 * `2026-07-18T21:00:00-03:00` — **sem milissegundos**.
 */
export function agoraBrasiliaIsoOffset(agora: Date = new Date()): string {
	const fmt = new Intl.DateTimeFormat("en-CA", {
		timeZone: FUSO_BRASILIA,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
	const parts = fmt.formatToParts(agora);
	const y = parte(parts, "year");
	const m = parte(parts, "month");
	const d = parte(parts, "day");
	const h = parte(parts, "hour");
	const min = parte(parts, "minute");
	const s = parte(parts, "second");
	return `${y}-${m}-${d}T${h}:${min}:${s}-03:00`;
}

/**
 * Data civil atual em Brasília: `yyyy-MM-dd` (campo `emissao`).
 */
export function hojeBrasiliaIsoDate(agora: Date = new Date()): string {
	return agoraBrasiliaIsoOffset(agora).slice(0, 10);
}

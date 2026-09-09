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

/** Soma dias a uma data civil `yyyy-MM-dd` sem depender do fuso do runtime. */
export function adicionarDiasIso(dataIso: string, dias: number): string {
	const [ano, mes, dia] = dataIso.split("-").map(Number);
	return new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, (dia ?? 1) + dias))
		.toISOString()
		.slice(0, 10);
}

/** Primeiro e último dia do mês civil de uma data `yyyy-MM-dd`. */
export function inicioFimMesDe(dataIso: string): {
	inicio: string;
	fim: string;
} {
	const [ano, mes] = dataIso.split("-").map(Number);
	return {
		inicio: `${dataIso.slice(0, 7)}-01`,
		fim: new Date(Date.UTC(ano ?? 0, mes ?? 1, 0)).toISOString().slice(0, 10),
	};
}

function timestampNaiveUtc(instante: Date): string {
	return instante.toISOString().replace("T", " ").replace("Z", "");
}

const TEM_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Serializa timestamp naive da API (UTC no banco) como ISO com `Z`,
 * para o cliente não interpretar o relógio como horário local.
 */
export function timestampUtcIso(value?: string | Date | null): string | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	}
	if (!value) return null;
	const raw = value.trim();
	if (!raw) return null;
	if (DATE_ONLY_PATTERN.test(raw)) return raw;

	if (TEM_OFFSET.test(raw)) {
		const comOffset = new Date(raw);
		return Number.isNaN(comOffset.getTime()) ? null : comOffset.toISOString();
	}

	const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
	const comoUtc = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
	return Number.isNaN(comoUtc.getTime()) ? null : comoUtc.toISOString();
}

/**
 * Limites UTC do período civil em Brasília: do 00:00 do início (inclusive)
 * até o 00:00 do dia seguinte ao fim (exclusive).
 */
export function limitesUtcDoPeriodoBrasilia(
	dataInicio: string,
	dataFim: string,
): { inicioUtc: string; fimUtcExclusivo: string } {
	const inicio = new Date(`${dataInicio}T00:00:00-03:00`);
	const fim = new Date(`${adicionarDiasIso(dataFim, 1)}T00:00:00-03:00`);
	return {
		inicioUtc: timestampNaiveUtc(inicio),
		fimUtcExclusivo: timestampNaiveUtc(fim),
	};
}

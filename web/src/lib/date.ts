export const FUSO_BRASILIA = "America/Sao_Paulo";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TEM_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

function parte(
	parts: Intl.DateTimeFormatPart[],
	tipo: Intl.DateTimeFormatPartTypes,
): string {
	return parts.find((item) => item.type === tipo)?.value ?? "";
}

function partesBrasilia(agora: Date): Intl.DateTimeFormatPart[] {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: FUSO_BRASILIA,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(agora);
}

/** Interpreta timestamp da API: com offset usa o instante; sem offset trata como UTC. */
export function parseInstantUtc(value?: string | Date | null): Date | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}
	if (!value) return null;
	const raw = value.trim();
	if (!raw) return null;

	if (TEM_OFFSET.test(raw)) {
		const comOffset = new Date(raw);
		return Number.isNaN(comOffset.getTime()) ? null : comOffset;
	}

	const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
	const comoUtc = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
	return Number.isNaN(comoUtc.getTime()) ? null : comoUtc;
}

/** Data civil atual em Brasília: `yyyy-MM-dd`. */
export function hojeBrasiliaIsoDate(agora: Date = new Date()): string {
	const parts = partesBrasilia(agora);
	return `${parte(parts, "year")}-${parte(parts, "month")}-${parte(parts, "day")}`;
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
	const inicio = `${dataIso.slice(0, 7)}-01`;
	const fim = new Date(Date.UTC(ano ?? 0, mes ?? 1, 0))
		.toISOString()
		.slice(0, 10);
	return { inicio, fim };
}

/** Primeiro e último dia do mês civil atual em Brasília. */
export function inicioFimMesBrasilia(agora: Date = new Date()): {
	inicio: string;
	fim: string;
} {
	return inicioFimMesDe(hojeBrasiliaIsoDate(agora));
}

/** Ano, mês e trimestre civis atuais em Brasília. */
export function anoMesBrasilia(agora: Date = new Date()): {
	ano: number;
	mes: number;
	trimestre: number;
} {
	const [ano, mes] = hojeBrasiliaIsoDate(agora).split("-").map(Number);
	const mesAtual = mes ?? 1;
	return {
		ano: ano ?? 0,
		mes: mesAtual,
		trimestre: Math.floor((mesAtual - 1) / 3) + 1,
	};
}

/** Extrai a parte YYYY-MM-DD de uma string de data (com ou sem hora). */
export function extractDateOnly(value?: string | null): string | null {
	if (!value) return null;

	const datePart = value.slice(0, 10);
	return DATE_ONLY_PATTERN.test(datePart) ? datePart : null;
}

/** Exibe YYYY-MM-DD como DD/MM/YYYY sem conversão de timezone. */
export function formatDateOnlyDisplay(value?: string | null): string {
	const datePart = extractDateOnly(value);
	if (!datePart) return value ? value : "-";

	const [year, month, day] = datePart.split("-");
	return `${day}/${month}/${year}`;
}

/** Preenche `<input type="date">` a partir de YYYY-MM-DD da API. */
export function formatDateOnlyForInput(value?: string | null): string {
	const datePart = extractDateOnly(value);
	if (datePart) return datePart;

	return hojeBrasiliaIsoDate();
}

/** Data atual em Brasília no formato YYYY-MM-DD. */
export function todayDateOnly(): string {
	return hojeBrasiliaIsoDate();
}

/** Dia civil em Brasília do instante (ou a própria data se já for YYYY-MM-DD). */
export function dataCivilBrasiliaIso(
	value?: string | Date | null,
): string | null {
	if (typeof value === "string" && DATE_ONLY_PATTERN.test(value.trim())) {
		return value.trim();
	}
	const instant = parseInstantUtc(value);
	if (!instant) {
		return extractDateOnly(typeof value === "string" ? value : null);
	}
	return hojeBrasiliaIsoDate(instant);
}

/** Exibe instante UTC da API no relógio de Brasília. */
export function formatDateTimeBrasilia(
	value?: string | Date | null,
	opcoes?: { comSegundos?: boolean },
): string {
	if (typeof value === "string" && DATE_ONLY_PATTERN.test(value.trim())) {
		return formatDateOnlyDisplay(value.trim());
	}
	const instant = parseInstantUtc(value);
	if (!instant) return "—";

	const parts = partesBrasilia(instant);
	const data = `${parte(parts, "day")}/${parte(parts, "month")}/${parte(parts, "year")}`;
	const hora = opcoes?.comSegundos
		? `${parte(parts, "hour")}:${parte(parts, "minute")}:${parte(parts, "second")}`
		: `${parte(parts, "hour")}:${parte(parts, "minute")}`;
	return `${data} ${hora}`;
}

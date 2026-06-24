import dayjs from "dayjs";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

	return dayjs().format("YYYY-MM-DD");
}

/** Data atual local no formato YYYY-MM-DD. */
export function todayDateOnly(): string {
	return dayjs().format("YYYY-MM-DD");
}

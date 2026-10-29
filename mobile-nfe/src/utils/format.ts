export function formatCurrency(value: string | number | null | undefined) {
	const num =
		typeof value === "number"
			? value
			: value
				? Number.parseFloat(value)
				: 0;
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number.isFinite(num) ? num : 0);
}

export function formatDateTime(iso: string | null | undefined) {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString("pt-BR");
}

export const MESES_BUDGET = [
	{ valor: 1, nome: "Janeiro" },
	{ valor: 2, nome: "Fevereiro" },
	{ valor: 3, nome: "Março" },
	{ valor: 4, nome: "Abril" },
	{ valor: 5, nome: "Maio" },
	{ valor: 6, nome: "Junho" },
	{ valor: 7, nome: "Julho" },
	{ valor: 8, nome: "Agosto" },
	{ valor: 9, nome: "Setembro" },
	{ valor: 10, nome: "Outubro" },
	{ valor: 11, nome: "Novembro" },
	{ valor: 12, nome: "Dezembro" },
] as const;

export function nomeMesBudget(mes: number | null | undefined) {
	if (!mes) return "";
	return MESES_BUDGET.find((m) => m.valor === mes)?.nome ?? String(mes);
}

export const PERIODOS_LOCACAO = [
	"diaria",
	"semanal",
	"quinzenal",
	"mensal",
] as const;

export type PeriodoLocacao = (typeof PERIODOS_LOCACAO)[number];

export const ROTULO_PERIODO_LOCACAO: Record<PeriodoLocacao, string> = {
	diaria: "Diária",
	semanal: "Semanal",
	quinzenal: "Quinzenal",
	mensal: "Mensal",
};

const DIAS_PERIODO_LOCACAO: Record<PeriodoLocacao, number> = {
	diaria: 1,
	semanal: 7,
	quinzenal: 15,
	mensal: 30,
};

export function calcularDataPrevistaLocacao(
	datainicio: string,
	periodo: PeriodoLocacao,
	quantidade: number,
): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(datainicio)) return "";
	const [ano, mes, dia] = datainicio.split("-").map(Number);
	const data = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1));
	data.setUTCDate(
		data.getUTCDate() + DIAS_PERIODO_LOCACAO[periodo] * quantidade - 1,
	);
	return data.toISOString().slice(0, 10);
}

export function formatarMoeda(valor: string | number | null | undefined) {
	const numero = Number(valor ?? 0);
	return numero.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}

export function formatarDataBr(valor: string | null | undefined) {
	if (!valor) return "—";
	const [ano, mes, dia] = valor.slice(0, 10).split("-");
	if (!ano || !mes || !dia) return valor;
	return `${dia}/${mes}/${ano}`;
}

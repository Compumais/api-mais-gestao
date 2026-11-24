import { formatarValorMonetario } from "@/util/recebimentos-venda-util.js";

export const PERIODOS_LOCACAO = [
	"diaria",
	"semanal",
	"quinzenal",
	"mensal",
] as const;

export type PeriodoLocacao = (typeof PERIODOS_LOCACAO)[number];

export const DIAS_PERIODO_LOCACAO: Record<PeriodoLocacao, number> = {
	diaria: 1,
	semanal: 7,
	quinzenal: 15,
	mensal: 30,
};

export function ehPeriodoLocacao(valor: string): valor is PeriodoLocacao {
	return (PERIODOS_LOCACAO as readonly string[]).includes(valor);
}

export function dataIsoValida(dataIso: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return false;
	return somarDiasIso(dataIso, 0) === dataIso;
}

export function somarDiasIso(dataIso: string, dias: number): string {
	const [ano, mes, dia] = dataIso.split("-").map(Number);
	const data = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1));
	data.setUTCDate(data.getUTCDate() + dias);
	return data.toISOString().slice(0, 10);
}

export function diferencaDiasIso(inicio: string, fim: string): number {
	const [anoInicio, mesInicio, diaInicio] = inicio.split("-").map(Number);
	const [anoFim, mesFim, diaFim] = fim.split("-").map(Number);
	const a = Date.UTC(anoInicio ?? 1970, (mesInicio ?? 1) - 1, diaInicio ?? 1);
	const b = Date.UTC(anoFim ?? 1970, (mesFim ?? 1) - 1, diaFim ?? 1);
	return Math.round((b - a) / 86_400_000);
}

export function calcularDataPrevistaLocacao(
	datainicio: string,
	periodo: PeriodoLocacao,
	quantidade: number,
): string {
	const dias = DIAS_PERIODO_LOCACAO[periodo] * quantidade;
	return somarDiasIso(datainicio, dias - 1);
}

export function arredondarMoeda(valor: number): number {
	return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export type PrecosEquipamentoLocacao = {
	precodiaria: string;
	precosemanal: string;
	precoquinzenal: string;
	precomensal: string;
};

export function precoDoPeriodoLocacao(
	precos: PrecosEquipamentoLocacao,
	periodo: PeriodoLocacao,
): number {
	const mapa: Record<PeriodoLocacao, string> = {
		diaria: precos.precodiaria,
		semanal: precos.precosemanal,
		quinzenal: precos.precoquinzenal,
		mensal: precos.precomensal,
	};
	return Number(mapa[periodo]);
}

export type CalculoItemLocacao = {
	dataprevista: string;
	diasatraso: number;
	valorperiodo: number;
	valormora: number;
	valortotal: number;
};

export function calcularItemLocacao(parametros: {
	datainicio: string;
	periodo: PeriodoLocacao;
	quantidade: number;
	valorunitario: number;
	valordiaria: number;
	datadevolucao?: string | null;
}): CalculoItemLocacao {
	const dataprevista = calcularDataPrevistaLocacao(
		parametros.datainicio,
		parametros.periodo,
		parametros.quantidade,
	);
	const valorperiodo = arredondarMoeda(
		parametros.valorunitario * parametros.quantidade,
	);
	const diasatraso = parametros.datadevolucao
		? Math.max(0, diferencaDiasIso(dataprevista, parametros.datadevolucao))
		: 0;
	const valormora = arredondarMoeda(diasatraso * parametros.valordiaria);
	const valortotal = arredondarMoeda(valorperiodo + valormora);
	return { dataprevista, diasatraso, valorperiodo, valormora, valortotal };
}

export function moedaLocacao(valor: number): string {
	return formatarValorMonetario(arredondarMoeda(valor));
}

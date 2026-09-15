import {
	adicionarDiasIso,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";

export type PeriodoPreset =
	| "hoje"
	| "ontem"
	| "7d"
	| "30d"
	| "mes_atual"
	| "mes_anterior"
	| "ano_atual"
	| "personalizado";

export type IntervaloDatas = {
	dataInicioStr: string;
	dataFimStr: string;
};

export type PeriodoResolvido = IntervaloDatas & {
	dias: number;
	periodoAnterior: IntervaloDatas;
	periodoYoY: IntervaloDatas;
};

export type KpiComVariacao = {
	valor: number;
	variacaoPeriodoAnteriorPct: number | null;
	variacaoYoYPct: number | null;
};

function inicioMesIso(dataIso: string): string {
	return `${dataIso.slice(0, 7)}-01`;
}

function fimMesIso(dataIso: string): string {
	const [ano, mes] = dataIso.split("-").map(Number);
	return new Date(Date.UTC(ano ?? 0, mes ?? 1, 0)).toISOString().slice(0, 10);
}

function inicioAnoIso(dataIso: string): string {
	return `${dataIso.slice(0, 4)}-01-01`;
}

function deslocarAnoIso(dataIso: string, anos: number): string {
	const [ano, mes, dia] = dataIso.split("-").map(Number);
	const utc = new Date(Date.UTC((ano ?? 0) + anos, (mes ?? 1) - 1, dia ?? 1));
	return utc.toISOString().slice(0, 10);
}

function msUtcDaDataIso(dataIso: string): number {
	const [ano, mes, dia] = dataIso.split("-").map(Number);
	return Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 1);
}

function diffDaysInclusiveIso(inicio: string, fim: string): number {
	return (
		Math.floor((msUtcDaDataIso(fim) - msUtcDaDataIso(inicio)) / 86_400_000) + 1
	);
}

function intervaloAnterior(inicio: string, fim: string): IntervaloDatas {
	const dias = diffDaysInclusiveIso(inicio, fim);
	const fimAnterior = adicionarDiasIso(inicio, -1);
	const inicioAnterior = adicionarDiasIso(fimAnterior, -(dias - 1));
	return {
		dataInicioStr: inicioAnterior,
		dataFimStr: fimAnterior,
	};
}

function intervaloYoY(inicio: string, fim: string): IntervaloDatas {
	return {
		dataInicioStr: deslocarAnoIso(inicio, -1),
		dataFimStr: deslocarAnoIso(fim, -1),
	};
}

export type ResolvePeriodoParams = {
	preset?: PeriodoPreset | undefined;
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	/** Compatibilidade com endpoints antigos baseados em dias */
	dias?: number | undefined;
	agora?: Date | undefined;
};

export function resolvePeriodo({
	preset,
	dataInicio,
	dataFim,
	dias,
	agora,
}: ResolvePeriodoParams): PeriodoResolvido {
	const hoje = hojeBrasiliaIsoDate(agora);

	let inicio = hoje;
	let fim = hoje;

	const presetEfetivo: PeriodoPreset =
		preset ??
		(dataInicio && dataFim
			? "personalizado"
			: dias
				? dias === 1
					? "hoje"
					: dias === 7
						? "7d"
						: dias === 30
							? "30d"
							: "personalizado"
				: "30d");

	switch (presetEfetivo) {
		case "hoje":
			inicio = hoje;
			fim = hoje;
			break;
		case "ontem":
			inicio = adicionarDiasIso(hoje, -1);
			fim = adicionarDiasIso(hoje, -1);
			break;
		case "7d":
			fim = hoje;
			inicio = adicionarDiasIso(hoje, -6);
			break;
		case "30d":
			fim = hoje;
			inicio = adicionarDiasIso(hoje, -29);
			break;
		case "mes_atual":
			inicio = inicioMesIso(hoje);
			fim = hoje;
			break;
		case "mes_anterior": {
			const ref = adicionarDiasIso(inicioMesIso(hoje), -1);
			inicio = inicioMesIso(ref);
			fim = fimMesIso(ref);
			break;
		}
		case "ano_atual":
			inicio = inicioAnoIso(hoje);
			fim = hoje;
			break;
		case "personalizado": {
			if (dataInicio && dataFim) {
				inicio = dataInicio;
				fim = dataFim;
			} else if (dias && dias > 0) {
				fim = hoje;
				inicio = adicionarDiasIso(hoje, -(dias - 1));
			} else {
				fim = hoje;
				inicio = adicionarDiasIso(hoje, -29);
			}
			break;
		}
		default:
			fim = hoje;
			inicio = adicionarDiasIso(hoje, -29);
	}

	if (msUtcDaDataIso(inicio) > msUtcDaDataIso(fim)) {
		const tmp = inicio;
		inicio = fim;
		fim = tmp;
	}

	return {
		dataInicioStr: inicio,
		dataFimStr: fim,
		dias: diffDaysInclusiveIso(inicio, fim),
		periodoAnterior: intervaloAnterior(inicio, fim),
		periodoYoY: intervaloYoY(inicio, fim),
	};
}

export function calcularVariacaoPct(
	atual: number,
	anterior: number,
): number | null {
	if (anterior === 0) {
		if (atual === 0) return null;
		return atual > 0 ? 100 : -100;
	}
	return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export function montarKpiComVariacao(
	valor: number,
	valorAnterior: number,
	valorYoY: number,
): KpiComVariacao {
	return {
		valor,
		variacaoPeriodoAnteriorPct: calcularVariacaoPct(valor, valorAnterior),
		variacaoYoYPct: calcularVariacaoPct(valor, valorYoY),
	};
}

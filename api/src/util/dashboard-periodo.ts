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

function toDateString(value: Date): string {
	const y = value.getFullYear();
	const m = String(value.getMonth() + 1).padStart(2, "0");
	const d = String(value.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function parseDateStr(value: string): Date {
	const [y, m, d] = value.split("-").map(Number);
	return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function diffDaysInclusive(inicio: Date, fim: Date): number {
	const ms = fim.getTime() - inicio.getTime();
	return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

function intervaloAnterior(inicio: Date, fim: Date): IntervaloDatas {
	const dias = diffDaysInclusive(inicio, fim);
	const fimAnterior = addDays(inicio, -1);
	const inicioAnterior = addDays(fimAnterior, -(dias - 1));
	return {
		dataInicioStr: toDateString(inicioAnterior),
		dataFimStr: toDateString(fimAnterior),
	};
}

function intervaloYoY(inicio: Date, fim: Date): IntervaloDatas {
	const inicioYoY = new Date(inicio);
	inicioYoY.setFullYear(inicioYoY.getFullYear() - 1);
	const fimYoY = new Date(fim);
	fimYoY.setFullYear(fimYoY.getFullYear() - 1);
	return {
		dataInicioStr: toDateString(inicioYoY),
		dataFimStr: toDateString(fimYoY),
	};
}

export type ResolvePeriodoParams = {
	preset?: PeriodoPreset | undefined;
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	/** Compatibilidade com endpoints antigos baseados em dias */
	dias?: number | undefined;
};

export function resolvePeriodo({
	preset,
	dataInicio,
	dataFim,
	dias,
}: ResolvePeriodoParams): PeriodoResolvido {
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);

	let inicio: Date;
	let fim: Date;

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
			inicio = new Date(hoje);
			fim = new Date(hoje);
			break;
		case "ontem":
			inicio = addDays(hoje, -1);
			fim = addDays(hoje, -1);
			break;
		case "7d":
			fim = new Date(hoje);
			inicio = addDays(hoje, -6);
			break;
		case "30d":
			fim = new Date(hoje);
			inicio = addDays(hoje, -29);
			break;
		case "mes_atual":
			inicio = startOfMonth(hoje);
			fim = new Date(hoje);
			break;
		case "mes_anterior": {
			const ref = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
			inicio = startOfMonth(ref);
			fim = endOfMonth(ref);
			break;
		}
		case "ano_atual":
			inicio = new Date(hoje.getFullYear(), 0, 1);
			fim = new Date(hoje);
			break;
		case "personalizado": {
			if (dataInicio && dataFim) {
				inicio = parseDateStr(dataInicio);
				fim = parseDateStr(dataFim);
			} else if (dias && dias > 0) {
				fim = new Date(hoje);
				inicio = addDays(hoje, -(dias - 1));
			} else {
				fim = new Date(hoje);
				inicio = addDays(hoje, -29);
			}
			break;
		}
		default:
			fim = new Date(hoje);
			inicio = addDays(hoje, -29);
	}

	if (inicio > fim) {
		const tmp = inicio;
		inicio = fim;
		fim = tmp;
	}

	return {
		dataInicioStr: toDateString(inicio),
		dataFimStr: toDateString(fim),
		dias: diffDaysInclusive(inicio, fim),
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

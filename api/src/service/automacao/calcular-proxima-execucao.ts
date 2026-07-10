export type RecorrenciaAutomacao = "unica" | "diaria" | "semanal" | "mensal";

export type CalcularProximaExecucaoParams = {
	recorrencia: RecorrenciaAutomacao;
	horario: string;
	diames?: number | null;
	diasemana?: number | null;
	/** Base para calcular a próxima (default: agora). Após execução, passar a data da execução. */
	aPartirDe?: Date;
	/** Se true, força a próxima ocorrência estritamente após aPartirDe (pós-execução). */
	aposExecucao?: boolean;
};

function parseHorario(horario: string): { hora: number; minuto: number } {
	const partes = horario.split(":");
	const h = Number.parseInt(partes[0] ?? "8", 10);
	const m = Number.parseInt(partes[1] ?? "0", 10);
	return {
		hora: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 8,
		minuto: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
	};
}

function aplicarHorario(data: Date, horario: string): Date {
	const { hora, minuto } = parseHorario(horario);
	const d = new Date(data);
	d.setSeconds(0, 0);
	d.setHours(hora, minuto, 0, 0);
	return d;
}

function ultimoDiaDoMes(ano: number, mes0: number): number {
	return new Date(ano, mes0 + 1, 0).getDate();
}

/**
 * Calcula a próxima execução local (timezone do servidor).
 */
export function calcularProximaExecucao({
	recorrencia,
	horario,
	diames,
	diasemana,
	aPartirDe = new Date(),
	aposExecucao = false,
}: CalcularProximaExecucaoParams): Date | null {
	const base = new Date(aPartirDe);

	if (recorrencia === "unica") {
		if (aposExecucao) return null;
		const candidata = aplicarHorario(base, horario);
		if (candidata.getTime() <= base.getTime()) {
			const amanha = new Date(base);
			amanha.setDate(amanha.getDate() + 1);
			return aplicarHorario(amanha, horario);
		}
		return candidata;
	}

	if (recorrencia === "diaria") {
		let candidata = aplicarHorario(base, horario);
		if (aposExecucao || candidata.getTime() <= base.getTime()) {
			const amanha = new Date(base);
			amanha.setDate(amanha.getDate() + 1);
			candidata = aplicarHorario(amanha, horario);
		}
		return candidata;
	}

	if (recorrencia === "semanal") {
		const alvo = diasemana ?? 1; // 0=domingo
		let candidata = aplicarHorario(base, horario);
		const diaAtual = candidata.getDay();
		let delta = (alvo - diaAtual + 7) % 7;
		if (
			delta === 0 &&
			(aposExecucao || candidata.getTime() <= base.getTime())
		) {
			delta = 7;
		}
		candidata.setDate(candidata.getDate() + delta);
		return aplicarHorario(candidata, horario);
	}

	// mensal
	const dia = Math.min(28, Math.max(1, diames ?? 5));
	let ano = base.getFullYear();
	let mes = base.getMonth();
	let candidata = new Date(ano, mes, Math.min(dia, ultimoDiaDoMes(ano, mes)));
	candidata = aplicarHorario(candidata, horario);

	if (aposExecucao || candidata.getTime() <= base.getTime()) {
		mes += 1;
		if (mes > 11) {
			mes = 0;
			ano += 1;
		}
		candidata = new Date(ano, mes, Math.min(dia, ultimoDiaDoMes(ano, mes)));
		candidata = aplicarHorario(candidata, horario);
	}

	return candidata;
}

/** Mês civil anterior à data de referência (YYYY-MM-DD). */
export function periodoMesAnterior(referencia: Date = new Date()): {
	dataInicio: string;
	dataFim: string;
} {
	const ano = referencia.getFullYear();
	const mes = referencia.getMonth();
	const inicio = new Date(ano, mes - 1, 1);
	const fim = new Date(ano, mes, 0);
	const fmt = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

import type {
	HorarioCardapio,
	HorarioDiaChave,
} from "@/model/cardapio-delivery-tipos.js";

export const HORARIO_DIA_CHAVES: HorarioDiaChave[] = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
];

const WEEKDAY_LONG_TO_KEY: Record<string, HorarioDiaChave> = {
	sunday: "sunday",
	monday: "monday",
	tuesday: "tuesday",
	wednesday: "wednesday",
	thursday: "thursday",
	friday: "friday",
	saturday: "saturday",
};

export type AvaliarHorarioCardapioResultado = {
	aberto: boolean;
	mensagem: string;
};

const MENSAGEM_PADRAO =
	"No momento não estamos aceitando pedidos. Confira nosso horário de funcionamento.";

function parseMinutos(hora: string | null | undefined): number | null {
	if (!hora) return null;
	const match = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
	if (!match) return null;
	const horas = Number(match[1]);
	const minutos = Number(match[2]);
	if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;
	return horas * 60 + minutos;
}

export function obterPartesHorario(
	data: Date,
	timezone: string,
): { minutos: number; dia: HorarioDiaChave; data: string } {
	const tz = timezone || "America/Sao_Paulo";
	const dataFmt = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const semanaFmt = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		weekday: "long",
	});
	const horaFmt = new Intl.DateTimeFormat("en-GB", {
		timeZone: tz,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	const dataKey = dataFmt.format(data);
	const weekday = semanaFmt.format(data).toLowerCase();
	const dia = WEEKDAY_LONG_TO_KEY[weekday];
	if (!dia) {
		throw new Error(`Dia da semana não mapeado: ${weekday}`);
	}

	const partes = horaFmt.formatToParts(data);
	let hora = 0;
	let minuto = 0;
	for (const parte of partes) {
		if (parte.type === "hour") hora = Number(parte.value);
		if (parte.type === "minute") minuto = Number(parte.value);
	}

	return { minutos: hora * 60 + minuto, dia, data: dataKey };
}

function estaNoIntervalo(
	minutos: number,
	inicio: string | null | undefined,
	fim: string | null | undefined,
): boolean {
	const ini = parseMinutos(inicio);
	const termino = parseMinutos(fim);
	if (ini == null || termino == null) return true;
	if (ini === termino) return true;
	if (ini < termino) return minutos >= ini && minutos < termino;
	return minutos >= ini || minutos < termino;
}

export function avaliarHorarioCardapio(
	horario: HorarioCardapio | null | undefined,
	agora = new Date(),
): AvaliarHorarioCardapioResultado {
	const mensagem = horario?.mensagem?.trim() || MENSAGEM_PADRAO;
	if (!horario || Number(horario.ativo) !== 1) {
		return { aberto: true, mensagem };
	}

	const partes = obterPartesHorario(
		agora,
		horario.timezone || "America/Sao_Paulo",
	);
	if ((horario.datasfechadas ?? []).includes(partes.data)) {
		return { aberto: false, mensagem };
	}

	if (horario.modo === "semanal") {
		const dia = horario.semanal?.[partes.dia];
		if (!dia?.ativo) {
			return { aberto: false, mensagem };
		}
		return {
			aberto: estaNoIntervalo(partes.minutos, dia.inicio, dia.fim),
			mensagem,
		};
	}

	return {
		aberto: estaNoIntervalo(partes.minutos, horario.inicio, horario.fim),
		mensagem,
	};
}

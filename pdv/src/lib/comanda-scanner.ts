export const TAMANHO_MINIMO_CODIGO_COMANDA = 2;
export const INTERVALO_MAXIMO_ENTRE_TECLAS_MS = 80;
export const TIMEOUT_BUFFER_COMANDA_MS = 250;
export const DEBOUNCE_LEITURA_COMANDA_MS = 750;

export type LeituraComandaNormalizada = {
	codigoOriginal: string;
	codigoConsulta: string;
	valida: boolean;
	removeuDigitoVerificador: boolean;
};

/**
 * Mantém o código lido intacto para integrações externas e deriva, separadamente,
 * o número usado na consulta do PDV sem o último dígito verificador.
 */
export function normalizarLeituraComanda(
	codigo: unknown,
): LeituraComandaNormalizada {
	const codigoOriginal = String(codigo ?? "").trim();
	const valida =
		/^\d+$/.test(codigoOriginal) &&
		codigoOriginal.length >= TAMANHO_MINIMO_CODIGO_COMANDA;

	return {
		codigoOriginal,
		codigoConsulta: valida ? codigoOriginal.slice(0, -1) : codigoOriginal,
		valida,
		removeuDigitoVerificador: valida,
	};
}

export type EstadoBufferLeitorComanda = {
	buffer: string;
	iniciadoEm: number | null;
	ultimaTeclaEm: number | null;
};

export const ESTADO_BUFFER_LEITOR_COMANDA_VAZIO: EstadoBufferLeitorComanda = {
	buffer: "",
	iniciadoEm: null,
	ultimaTeclaEm: null,
};

type EntradaTeclaLeitor = {
	key: string;
	agora: number;
	emCampoDigitacao?: boolean;
	comModificador?: boolean;
	repetida?: boolean;
};

export type ResultadoTeclaLeitor = {
	estado: EstadoBufferLeitorComanda;
	codigoOriginal?: string;
	deveConsumirEvento: boolean;
};

function estadoVazio(): EstadoBufferLeitorComanda {
	return { ...ESTADO_BUFFER_LEITOR_COMANDA_VAZIO };
}

/**
 * Máquina de estado pura do leitor. Só confirma sequências numéricas rápidas
 * terminadas por Enter e nunca observa digitação em inputs/editors.
 */
export function processarTeclaLeitorComanda(
	estadoAtual: EstadoBufferLeitorComanda,
	entrada: EntradaTeclaLeitor,
): ResultadoTeclaLeitor {
	if (
		entrada.emCampoDigitacao ||
		entrada.comModificador ||
		entrada.repetida ||
		/^F(?:[1-9]|1[0-2])$/.test(entrada.key)
	) {
		return {
			estado: estadoVazio(),
			deveConsumirEvento: false,
		};
	}

	const expirou =
		estadoAtual.ultimaTeclaEm !== null &&
		entrada.agora - estadoAtual.ultimaTeclaEm >
			INTERVALO_MAXIMO_ENTRE_TECLAS_MS;
	const estado = expirou ? estadoVazio() : estadoAtual;

	if (entrada.key === "Enter") {
		const leitura = normalizarLeituraComanda(estado.buffer);
		return {
			estado: estadoVazio(),
			codigoOriginal: leitura.valida ? leitura.codigoOriginal : undefined,
			deveConsumirEvento: leitura.valida,
		};
	}

	if (/^\d$/.test(entrada.key)) {
		return {
			estado: {
				buffer: `${estado.buffer}${entrada.key}`,
				iniciadoEm: estado.iniciadoEm ?? entrada.agora,
				ultimaTeclaEm: entrada.agora,
			},
			deveConsumirEvento: false,
		};
	}

	return {
		estado: estadoVazio(),
		deveConsumirEvento: false,
	};
}

export function alvoEhCampoDigitacao(alvo: unknown): boolean {
	if (!alvo || typeof alvo !== "object") return false;
	const elemento = alvo as {
		tagName?: string;
		isContentEditable?: boolean;
		getAttribute?: (nome: string) => string | null;
	};
	const tag = elemento.tagName?.toUpperCase();
	return (
		tag === "INPUT" ||
		tag === "TEXTAREA" ||
		tag === "SELECT" ||
		elemento.isContentEditable === true ||
		elemento.getAttribute?.("role") === "textbox"
	);
}

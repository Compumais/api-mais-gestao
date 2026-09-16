export type TecnibraXmlLayout = {
	rootElement: string;
	commandElement: string;
	/** Zeros à esquerda no número enviado à catraca (1 → 1, 2 → 01, 3 → 001). */
	casas: number;
	/** Remove o último dígito (DV) antes de formatar para o XML. */
	ignorarDigitoVerificador: boolean;
};

const LAYOUT_PADRAO: TecnibraXmlLayout = {
	rootElement: "Comandas",
	commandElement: "Comanda",
	casas: 1,
	ignorarDigitoVerificador: false,
};

export const CASAS_COMANDA_MIN = 1;
export const CASAS_COMANDA_MAX = 6;

const NOME_ELEM = /^[A-Za-z_][\w.-]*$/;

export function normalizarCasasComanda(valor: unknown): number {
	const n = Math.trunc(Number(valor));
	if (!Number.isFinite(n)) {
		return LAYOUT_PADRAO.casas;
	}
	return Math.min(CASAS_COMANDA_MAX, Math.max(CASAS_COMANDA_MIN, n));
}

export function normalizarIgnorarDigitoVerificador(valor: unknown): boolean {
	if (typeof valor === "boolean") {
		return valor;
	}
	const texto = String(valor ?? "")
		.trim()
		.toLowerCase();
	return texto === "1" || texto === "true" || texto === "sim";
}

/**
 * Remove o dígito verificador (último dígito) quando a opção estiver ativa.
 * Números com um único dígito permanecem intactos.
 */
export function aplicarIgnorarDigitoVerificador(
	numero: string | number,
	ignorar: boolean,
): string {
	const texto = String(numero).trim();
	if (!ignorar || !/^\d+$/.test(texto) || texto.length < 2) {
		return texto;
	}
	return texto.slice(0, -1);
}

/** Completa o número da comanda com zeros à esquerda, sem truncar. */
export function formatarNumeroComanda(
	numero: string | number,
	casas: number,
	ignorarDigitoVerificador = false,
): string {
	const texto = aplicarIgnorarDigitoVerificador(
		numero,
		ignorarDigitoVerificador,
	);
	const largura = normalizarCasasComanda(casas);
	if (!/^\d+$/.test(texto)) {
		return texto;
	}
	return texto.padStart(largura, "0");
}

export function normalizarNumerosComanda(
	comandas: Array<string | number>,
	casas = LAYOUT_PADRAO.casas,
	ignorarDigitoVerificador = LAYOUT_PADRAO.ignorarDigitoVerificador,
): string[] {
	const largura = normalizarCasasComanda(casas);
	return [
		...new Set(
			comandas
				.map((item) =>
					formatarNumeroComanda(item, largura, ignorarDigitoVerificador),
				)
				.filter(Boolean),
		),
	].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function nomeElemento(valor: string | undefined, padrao: string): string {
	const nome = valor?.trim() || padrao;
	return NOME_ELEM.test(nome) ? nome : padrao;
}

function escapeXml(valor: string): string {
	return valor
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function gerarXmlComandas(
	comandas: Array<string | number>,
	layout: Partial<TecnibraXmlLayout> = {},
): string {
	const root = nomeElemento(layout.rootElement, LAYOUT_PADRAO.rootElement);
	const item = nomeElemento(
		layout.commandElement,
		LAYOUT_PADRAO.commandElement,
	);
	const numeros = normalizarNumerosComanda(
		comandas,
		normalizarCasasComanda(layout.casas),
		normalizarIgnorarDigitoVerificador(
			layout.ignorarDigitoVerificador ?? LAYOUT_PADRAO.ignorarDigitoVerificador,
		),
	);
	if (numeros.length === 0) {
		return `<?xml version="1.0" encoding="UTF-8"?>\n<${root} />\n`;
	}
	const corpo = numeros
		.map((numero) => `    <${item}>${escapeXml(numero)}</${item}>`)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>\n<${root}>\n${corpo}\n</${root}>\n`;
}

export type TecnibraXmlLayout = {
	rootElement: string;
	commandElement: string;
};

const LAYOUT_PADRAO: TecnibraXmlLayout = {
	rootElement: "Comandas",
	commandElement: "Comanda",
};

const NOME_ELEM = /^[A-Za-z_][\w.-]*$/;

export function normalizarNumerosComanda(
	comandas: Array<string | number>,
): string[] {
	return [
		...new Set(comandas.map((item) => String(item).trim()).filter(Boolean)),
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
	const numeros = normalizarNumerosComanda(comandas);
	if (numeros.length === 0) {
		return `<?xml version="1.0" encoding="UTF-8"?>\n<${root} />\n`;
	}
	const corpo = numeros
		.map((numero) => `    <${item}>${escapeXml(numero)}</${item}>`)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>\n<${root}>\n${corpo}\n</${root}>\n`;
}

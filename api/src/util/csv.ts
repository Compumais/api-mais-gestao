import { Buffer } from "node:buffer";
import { stringify } from "csv-stringify/sync";

export const CONTENT_TYPE_CSV = "text/csv; charset=utf-8";
export const LIMITE_EXPORTACAO_CSV = 50_000;

export type ValorCelulaCsv = string | number;

export type GerarCsvOpcoes = {
	colunas: string[];
	linhas: Array<Array<ValorCelulaCsv>>;
	quoted?: boolean;
	recordDelimiter?: "windows" | "unix";
};

export function protegerFormulaPlanilha(valor: ValorCelulaCsv): ValorCelulaCsv {
	if (typeof valor !== "string") return valor;
	return /^[\s]*[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

export function gerarCsv({
	colunas,
	linhas,
	quoted = true,
	recordDelimiter = quoted ? "windows" : "unix",
}: GerarCsvOpcoes): Buffer {
	const linhasSeguras = linhas.map((linha) =>
		linha.map(protegerFormulaPlanilha),
	);
	const conteudo = stringify([colunas, ...linhasSeguras], {
		delimiter: ";",
		quoted,
		record_delimiter: recordDelimiter,
	});
	return Buffer.from(`\uFEFF${conteudo}`, "utf-8");
}

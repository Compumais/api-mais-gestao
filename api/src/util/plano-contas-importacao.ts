import { Buffer } from "node:buffer";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { compararCodigoHierarquico } from "@/util/comparar-codigo-hierarquico.js";

export type FormatoArquivoImportacao = "csv" | "xlsx";

export type ContaImportacaoPlanoContas = {
	linha: number;
	codigo: string;
	nome: string;
	tipomovimento: "E" | "S" | null;
	inativo: 0 | 1;
	nivel: number;
	codigoPai: string | null;
	erros: string[];
};

export type ResultadoValidacaoImportacaoPlanoContas = {
	contas: ContaImportacaoPlanoContas[];
	totalContas: number;
	totalErros: number;
	errosGerais: string[];
};

const LIMITE_CONTAS_IMPORTACAO = 20000;
const TAMANHO_MAXIMO_CODIGO = 30;
const TAMANHO_MAXIMO_NOME = 40;

const COLUNAS_OBRIGATORIAS = ["codigo", "descricao", "tipo", "ativo"] as const;

type ColunaImportacao = (typeof COLUNAS_OBRIGATORIAS)[number];

function normalizarTexto(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();
}

function mapearColuna(cabecalho: string): ColunaImportacao | null {
	const normalizado = normalizarTexto(cabecalho);

	if (normalizado === "codigo") {
		return "codigo";
	}
	if (normalizado === "descricao" || normalizado === "nome") {
		return "descricao";
	}
	if (normalizado === "tipo") {
		return "tipo";
	}
	if (normalizado === "ativo") {
		return "ativo";
	}

	return null;
}

function normalizarCodigo(valor: string): string {
	return valor
		.trim()
		.replace(/[.\-/]/g, " ")
		.replace(/\s+/g, " ");
}

function converterTipo(valor: string): "E" | "S" | null {
	const normalizado = normalizarTexto(valor);

	if (["e", "entrada", "receita", "credito"].includes(normalizado)) {
		return "E";
	}
	if (["s", "saida", "despesa", "debito"].includes(normalizado)) {
		return "S";
	}

	return null;
}

function converterAtivo(valor: string): 0 | 1 | null {
	const normalizado = normalizarTexto(valor);

	if (normalizado === "" || ["sim", "s", "1", "true"].includes(normalizado)) {
		return 0;
	}
	if (["nao", "n", "0", "false"].includes(normalizado)) {
		return 1;
	}

	return null;
}

function converterCelulaParaTexto(valor: unknown): string {
	if (valor === null || valor === undefined) {
		return "";
	}
	if (typeof valor === "string") {
		return valor;
	}
	if (typeof valor === "number" || typeof valor === "boolean") {
		return String(valor);
	}
	if (valor instanceof Date) {
		return valor.toISOString();
	}
	if (typeof valor === "object") {
		const objeto = valor as {
			text?: unknown;
			result?: unknown;
			richText?: { text?: string }[];
		};
		if (Array.isArray(objeto.richText)) {
			return objeto.richText.map((parte) => parte.text ?? "").join("");
		}
		if (objeto.result !== undefined) {
			return converterCelulaParaTexto(objeto.result);
		}
		if (objeto.text !== undefined) {
			return converterCelulaParaTexto(objeto.text);
		}
	}

	return String(valor);
}

function extrairLinhasCsv(conteudo: string): string[][] {
	const conteudoSemBom = conteudo.replace(/^\uFEFF/, "");
	const primeiraLinha = conteudoSemBom.split(/\r?\n/, 1)[0] ?? "";
	const delimitador =
		(primeiraLinha.match(/;/g)?.length ?? 0) >=
		(primeiraLinha.match(/,/g)?.length ?? 0)
			? ";"
			: ",";

	const registros = parse(conteudoSemBom, {
		delimiter: delimitador,
		skip_empty_lines: true,
		relax_column_count: true,
		trim: true,
	}) as string[][];

	return registros;
}

async function extrairLinhasXlsx(conteudoBase64: string): Promise<string[][]> {
	const buffer = Buffer.from(conteudoBase64, "base64");
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

	const planilha = workbook.worksheets[0];

	if (!planilha) {
		return [];
	}

	const linhas: string[][] = [];

	planilha.eachRow({ includeEmpty: false }, (linha) => {
		const valores: string[] = [];
		const quantidadeColunas = Math.max(linha.cellCount, 4);

		for (let coluna = 1; coluna <= quantidadeColunas; coluna++) {
			valores.push(converterCelulaParaTexto(linha.getCell(coluna).value));
		}

		linhas.push(valores);
	});

	return linhas;
}

export async function validarArquivoImportacaoPlanoContas(
	formato: FormatoArquivoImportacao,
	conteudo: string,
): Promise<ResultadoValidacaoImportacaoPlanoContas> {
	const errosGerais: string[] = [];

	let linhas: string[][];

	try {
		linhas =
			formato === "csv"
				? extrairLinhasCsv(conteudo)
				: await extrairLinhasXlsx(conteudo);
	} catch {
		return {
			contas: [],
			totalContas: 0,
			totalErros: 0,
			errosGerais: [
				formato === "csv"
					? "Não foi possível ler o arquivo CSV. Verifique se o arquivo está no formato correto."
					: "Não foi possível ler o arquivo XLSX. Verifique se o arquivo está no formato correto.",
			],
		};
	}

	const linhasComConteudo = linhas.filter((linha) =>
		linha.some((valor) => valor.trim() !== ""),
	);

	if (linhasComConteudo.length === 0) {
		return {
			contas: [],
			totalContas: 0,
			totalErros: 0,
			errosGerais: ["O arquivo está vazio."],
		};
	}

	const cabecalho = linhasComConteudo[0] ?? [];
	const indicePorColuna = new Map<ColunaImportacao, number>();

	cabecalho.forEach((valor, indice) => {
		const coluna = mapearColuna(valor);
		if (coluna && !indicePorColuna.has(coluna)) {
			indicePorColuna.set(coluna, indice);
		}
	});

	const colunasAusentes = COLUNAS_OBRIGATORIAS.filter(
		(coluna) => !indicePorColuna.has(coluna),
	);

	if (colunasAusentes.length > 0) {
		const nomesColunas: Record<ColunaImportacao, string> = {
			codigo: "Código",
			descricao: "Descrição",
			tipo: "Tipo",
			ativo: "Ativo",
		};

		return {
			contas: [],
			totalContas: 0,
			totalErros: 0,
			errosGerais: [
				`Colunas obrigatórias ausentes no arquivo: ${colunasAusentes
					.map((coluna) => nomesColunas[coluna])
					.join(", ")}.`,
			],
		};
	}

	const linhasDados = linhasComConteudo.slice(1);

	if (linhasDados.length === 0) {
		return {
			contas: [],
			totalContas: 0,
			totalErros: 0,
			errosGerais: ["O arquivo não possui contas para importar."],
		};
	}

	if (linhasDados.length > LIMITE_CONTAS_IMPORTACAO) {
		errosGerais.push(
			`O arquivo possui ${linhasDados.length} contas e excede o limite de ${LIMITE_CONTAS_IMPORTACAO} contas por importação.`,
		);
	}

	const contas: ContaImportacaoPlanoContas[] = [];
	const codigosVistos = new Map<string, number>();

	linhasDados.forEach((valores, indice) => {
		const numeroLinha = indice + 2;
		const erros: string[] = [];

		const codigoBruto = valores[indicePorColuna.get("codigo") ?? 0] ?? "";
		const nomeBruto = valores[indicePorColuna.get("descricao") ?? 1] ?? "";
		const tipoBruto = valores[indicePorColuna.get("tipo") ?? 2] ?? "";
		const ativoBruto = valores[indicePorColuna.get("ativo") ?? 3] ?? "";

		const codigo = normalizarCodigo(codigoBruto);
		const nome = nomeBruto.trim();

		if (!codigo) {
			erros.push("Código não informado.");
		} else if (!/^\d+( \d+)*$/.test(codigo)) {
			erros.push(
				`Código "${codigoBruto.trim()}" inválido. Use números separados por espaço ou ponto (ex: 1, 1 1, 1 1 2).`,
			);
		} else if (codigo.length > TAMANHO_MAXIMO_CODIGO) {
			erros.push(
				`Código excede o limite de ${TAMANHO_MAXIMO_CODIGO} caracteres.`,
			);
		} else {
			const linhaDuplicada = codigosVistos.get(codigo);
			if (linhaDuplicada !== undefined) {
				erros.push(
					`Código duplicado (já utilizado na linha ${linhaDuplicada}).`,
				);
			} else {
				codigosVistos.set(codigo, numeroLinha);
			}
		}

		if (!nome) {
			erros.push("Descrição não informada.");
		} else if (nome.length > TAMANHO_MAXIMO_NOME) {
			erros.push(
				`Descrição excede o limite de ${TAMANHO_MAXIMO_NOME} caracteres.`,
			);
		}

		const tipomovimento = converterTipo(tipoBruto);

		if (!tipoBruto.trim()) {
			erros.push("Tipo não informado.");
		} else if (!tipomovimento) {
			erros.push(
				`Tipo "${tipoBruto.trim()}" inválido. Use E (Entrada/Receita) ou S (Saída/Despesa).`,
			);
		}

		const inativo = converterAtivo(ativoBruto);

		if (inativo === null) {
			erros.push(
				`Valor "${ativoBruto.trim()}" inválido para Ativo. Use Sim ou Não.`,
			);
		}

		const segmentos = codigo ? codigo.split(" ") : [];
		const nivel = segmentos.length;
		const codigoPai = nivel > 1 ? segmentos.slice(0, -1).join(" ") : null;

		contas.push({
			linha: numeroLinha,
			codigo,
			nome,
			tipomovimento,
			inativo: inativo ?? 0,
			nivel,
			codigoPai,
			erros,
		});
	});

	// Valida conta pai inexistente (só faz sentido para códigos válidos e não duplicados)
	for (const conta of contas) {
		if (conta.codigoPai && codigosVistos.get(conta.codigo) === conta.linha) {
			if (!codigosVistos.has(conta.codigoPai)) {
				conta.erros.push(
					`Conta pai com código "${conta.codigoPai}" não encontrada no arquivo.`,
				);
			}
		}
	}

	const contasOrdenadas = [...contas].sort((a, b) =>
		compararCodigoHierarquico(a.codigo, b.codigo),
	);

	const totalErros = contasOrdenadas.reduce(
		(total, conta) => total + conta.erros.length,
		0,
	);

	return {
		contas: contasOrdenadas,
		totalContas: contasOrdenadas.length,
		totalErros,
		errosGerais,
	};
}

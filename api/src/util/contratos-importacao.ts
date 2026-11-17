import { Buffer } from "node:buffer";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { parseNumeroDecimal } from "@/util/campos-impostos-produto.js";
import type { FormatoArquivoImportacao } from "@/util/plano-contas-importacao.js";

export type { FormatoArquivoImportacao };

export const LIMITE_CONTRATOS_IMPORTACAO = 5000;

export const COLUNAS_IMPORTACAO_CONTRATOS = [
	{
		campo: "codigocliente",
		cabecalho: "Código do cliente",
		aliases: [
			"codigo do cliente",
			"codigocliente",
			"codigo cliente",
			"cnpj",
			"cpf",
			"cnpj/cpf",
			"cnpjcpf",
			"documento",
		],
		obrigatorio: true,
	},
	{
		campo: "grupocontrato",
		cabecalho: "Grupo contrato",
		aliases: [
			"grupo contrato",
			"grupocontrato",
			"grupo do contrato",
			"grupo",
		],
		obrigatorio: false,
	},
	{
		campo: "tipocontrato",
		cabecalho: "Tipo contrato",
		aliases: ["tipo contrato", "tipocontrato", "tipo do contrato", "tipo"],
		obrigatorio: false,
	},
	{
		campo: "descricao",
		cabecalho: "Descrição do contrato",
		aliases: [
			"descricao do contrato",
			"descricao",
			"descrição do contrato",
			"contrato",
		],
		obrigatorio: true,
	},
	{
		campo: "valor",
		cabecalho: "Valor",
		aliases: ["valor", "valor do contrato", "preco", "preço"],
		obrigatorio: true,
	},
	{
		campo: "vencimento",
		cabecalho: "Vencimento",
		aliases: [
			"vencimento",
			"dia vencimento",
			"diavencimento",
			"dia de vencimento",
		],
		obrigatorio: true,
	},
] as const;

export type CampoImportacaoContrato =
	(typeof COLUNAS_IMPORTACAO_CONTRATOS)[number]["campo"];

export const CABECALHO_TEMPLATE_CONTRATOS = COLUNAS_IMPORTACAO_CONTRATOS.map(
	(coluna) => coluna.cabecalho,
);

export type LinhaImportacaoContrato = {
	linha: number;
	codigocliente: string;
	grupocontrato: string;
	tipocontrato: string;
	descricao: string;
	valor: string | null;
	diavencimento: number | null;
	erros: string[];
};

export type ResultadoValidacaoImportacaoContratos = {
	contratos: LinhaImportacaoContrato[];
	totalContratos: number;
	totalErros: number;
	errosGerais: string[];
};

function normalizarTexto(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();
}

export function normalizarTextoCabecalho(valor: string): string {
	return normalizarTexto(valor);
}

function mapearColuna(cabecalho: string): CampoImportacaoContrato | null {
	const normalizado = normalizarTexto(cabecalho);
	if (!normalizado) return null;

	for (const coluna of COLUNAS_IMPORTACAO_CONTRATOS) {
		const aliases = [
			normalizarTexto(coluna.cabecalho),
			...coluna.aliases.map((alias) => normalizarTexto(alias)),
		];
		if (aliases.includes(normalizado)) {
			return coluna.campo;
		}
	}

	return null;
}

function converterCelulaParaTexto(valor: unknown): string {
	if (valor == null) return "";
	if (typeof valor === "string") return valor.trim();
	if (typeof valor === "number" || typeof valor === "boolean") {
		return String(valor);
	}
	if (valor instanceof Date) {
		const dia = String(valor.getUTCDate()).padStart(2, "0");
		const mes = String(valor.getUTCMonth() + 1).padStart(2, "0");
		const ano = valor.getUTCFullYear();
		return `${dia}/${mes}/${ano}`;
	}
	if (typeof valor === "object") {
		const objeto = valor as {
			text?: unknown;
			result?: unknown;
			richText?: Array<{ text?: string }>;
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

	return parse(conteudoSemBom, {
		delimiter: delimitador,
		skip_empty_lines: true,
		relax_column_count: true,
		trim: true,
	}) as string[][];
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
		const quantidadeColunas = Math.max(
			linha.cellCount,
			CABECALHO_TEMPLATE_CONTRATOS.length,
		);

		for (let coluna = 1; coluna <= quantidadeColunas; coluna++) {
			valores.push(converterCelulaParaTexto(linha.getCell(coluna).value));
		}

		linhas.push(valores);
	});

	return linhas;
}

function parseDiaVencimento(valor: string): number | null {
	const texto = valor.trim();
	if (!texto) return null;

	if (/^\d{1,2}$/.test(texto)) {
		const dia = Number(texto);
		if (dia >= 1 && dia <= 28) return dia;
		if (dia > 28 && dia <= 31) return 28;
		return null;
	}

	const matchBr = texto.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
	if (matchBr) {
		const dia = Number(matchBr[1]);
		if (dia >= 1 && dia <= 28) return dia;
		if (dia > 28 && dia <= 31) return 28;
		return null;
	}

	const matchIso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (matchIso) {
		const dia = Number(matchIso[3]);
		if (dia >= 1 && dia <= 28) return dia;
		if (dia > 28 && dia <= 31) return 28;
		return null;
	}

	return null;
}

export function validarExtensaoArquivoContratos(
	formato: FormatoArquivoImportacao,
	nomeArquivo: string | undefined,
): string | null {
	if (!nomeArquivo) {
		return null;
	}

	if (!nomeArquivo.toLowerCase().endsWith(`.${formato}`)) {
		return `Extensão inválida: o arquivo "${nomeArquivo}" não é um arquivo .${formato}.`;
	}

	return null;
}

export async function validarArquivoImportacaoContratos(
	formato: FormatoArquivoImportacao,
	conteudo: string,
): Promise<ResultadoValidacaoImportacaoContratos> {
	const errosGerais: string[] = [];

	let linhas: string[][];
	try {
		linhas =
			formato === "csv"
				? extrairLinhasCsv(conteudo)
				: await extrairLinhasXlsx(conteudo);
	} catch {
		return {
			contratos: [],
			totalContratos: 0,
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
			contratos: [],
			totalContratos: 0,
			totalErros: 0,
			errosGerais: ["O arquivo está vazio."],
		};
	}

	const cabecalhos = linhasComConteudo[0] ?? [];
	const mapaColunas = new Map<CampoImportacaoContrato, number>();

	cabecalhos.forEach((cabecalho, indice) => {
		const campo = mapearColuna(cabecalho);
		if (campo && !mapaColunas.has(campo)) {
			mapaColunas.set(campo, indice);
		}
	});

	for (const coluna of COLUNAS_IMPORTACAO_CONTRATOS) {
		if (coluna.obrigatorio && !mapaColunas.has(coluna.campo)) {
			errosGerais.push(`Coluna obrigatória ausente: ${coluna.cabecalho}.`);
		}
	}

	if (errosGerais.length > 0) {
		return {
			contratos: [],
			totalContratos: 0,
			totalErros: 0,
			errosGerais,
		};
	}

	const dados = linhasComConteudo.slice(1);
	if (dados.length === 0) {
		return {
			contratos: [],
			totalContratos: 0,
			totalErros: 0,
			errosGerais: ["O arquivo não possui linhas de dados."],
		};
	}

	if (dados.length > LIMITE_CONTRATOS_IMPORTACAO) {
		return {
			contratos: [],
			totalContratos: dados.length,
			totalErros: 0,
			errosGerais: [
				`O arquivo excede o limite de ${LIMITE_CONTRATOS_IMPORTACAO} contratos por importação.`,
			],
		};
	}

	const contratos: LinhaImportacaoContrato[] = [];
	let totalErros = 0;

	dados.forEach((linha, indice) => {
		const erros: string[] = [];
		const obter = (campo: CampoImportacaoContrato) => {
			const posicao = mapaColunas.get(campo);
			if (posicao === undefined) return "";
			return (linha[posicao] ?? "").trim();
		};

		const codigocliente = obter("codigocliente");
		const grupocontrato = obter("grupocontrato");
		const tipocontrato = obter("tipocontrato");
		const descricao = obter("descricao");
		const valorTexto = obter("valor");
		const vencimentoTexto = obter("vencimento");

		if (!codigocliente) {
			erros.push("Informe o código do cliente (CNPJ/CPF)");
		}
		if (!descricao) {
			erros.push("Informe a descrição do contrato");
		}

		const valorNumero = parseNumeroDecimal(valorTexto);
		let valor: string | null = null;
		if (valorNumero === null || !(valorNumero > 0)) {
			erros.push("Valor deve ser maior que zero");
		} else {
			valor = valorNumero.toFixed(2);
		}

		const diavencimento = parseDiaVencimento(vencimentoTexto);
		if (diavencimento === null) {
			erros.push("Vencimento inválido (informe o dia 1-28 ou uma data)");
		}

		if (erros.length > 0) {
			totalErros += erros.length;
		}

		contratos.push({
			linha: indice + 2,
			codigocliente,
			grupocontrato,
			tipocontrato,
			descricao,
			valor,
			diavencimento,
			erros,
		});
	});

	return {
		contratos,
		totalContratos: contratos.length,
		totalErros,
		errosGerais,
	};
}

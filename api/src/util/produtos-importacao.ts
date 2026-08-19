import { Buffer } from "node:buffer";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { parseNumeroDecimal } from "@/util/campos-impostos-produto.js";
import type { FormatoArquivoImportacao } from "@/util/plano-contas-importacao.js";

export type { FormatoArquivoImportacao };

export const LIMITE_PRODUTOS_IMPORTACAO = 10000;

export const COLUNAS_ALIQUOTA_PRODUTO = [
	{
		campo: "aliquotaicmsinterna",
		cabecalho: "Alíquota ICMS interna",
		aliases: ["aliquota icms interna", "icms interna"],
	},
	{
		campo: "aliquotaicmsdiferencialentrada",
		cabecalho: "Alíquota ICMS diferencial entrada",
		aliases: ["aliquota icms diferencial entrada", "icms diferencial"],
	},
	{
		campo: "aliquotareducaoicmsnfcesat",
		cabecalho: "Alíquota redução ICMS NFC-e",
		aliases: [
			"aliquota reducao icms nfce",
			"reducao icms nfce",
			"aliquota reducao icms nfce sat",
		],
	},
	{
		campo: "aliquotafcpnf",
		cabecalho: "Alíquota FCP NF",
		aliases: ["aliquota fcp nf", "fcp nf", "aliquota fcp"],
	},
	{
		campo: "ultimaaliquotaicmsst",
		cabecalho: "Última alíquota ICMS ST",
		aliases: ["ultima aliquota icms st", "aliquota icms st"],
	},
	{
		campo: "ultimaaliquotafcpst",
		cabecalho: "Última alíquota FCP ST",
		aliases: ["ultima aliquota fcp st", "aliquota fcp st"],
	},
	{
		campo: "aliquotapis",
		cabecalho: "Alíquota PIS saída",
		aliases: ["aliquota pis saida", "aliquota pis", "pis"],
	},
	{
		campo: "aliquotapisentrada",
		cabecalho: "Alíquota PIS entrada",
		aliases: ["aliquota pis entrada"],
	},
	{
		campo: "aliquotacofins",
		cabecalho: "Alíquota COFINS saída",
		aliases: ["aliquota cofins saida", "aliquota cofins", "cofins"],
	},
	{
		campo: "aliquotaconfinsentrada",
		cabecalho: "Alíquota COFINS entrada",
		aliases: ["aliquota cofins entrada", "aliquota confins entrada"],
	},
	{
		campo: "aliquotapisconfinssaidapreco",
		cabecalho: "Alíquota PIS/COFINS saída preço",
		aliases: ["aliquota pis cofins saida preco"],
	},
	{
		campo: "aliquotapisconfinsentradapreco",
		cabecalho: "Alíquota PIS/COFINS entrada preço",
		aliases: ["aliquota pis cofins entrada preco"],
	},
	{
		campo: "aliquotaiss",
		cabecalho: "Alíquota ISS",
		aliases: ["aliquota iss", "iss"],
	},
] as const;

export type CampoAliquotaProduto =
	(typeof COLUNAS_ALIQUOTA_PRODUTO)[number]["campo"];

const COLUNAS_BASE = [
	"codigo",
	"ean",
	"referencia",
	"nome",
	"grupo",
	"unidade",
	"preco",
	"custo",
	"ncm",
	"cest",
	"origem",
	"mva",
	"estoque",
	"ippt",
	"cfopsaida",
	"cfopentrada",
	"cfopnfce",
	"cst",
	"csosn",
	...COLUNAS_ALIQUOTA_PRODUTO.map((coluna) => coluna.campo),
] as const;

type ColunaImportacao = (typeof COLUNAS_BASE)[number];

const COLUNAS_OBRIGATORIAS = [
	"nome",
	"grupo",
	"unidade",
	"preco",
	"ncm",
] as const;

export type AliquotasProdutoImportacao = Record<
	CampoAliquotaProduto,
	string | null
>;

export type LinhaImportacaoProduto = {
	linha: number;
	codigo: number | null;
	ean: string | null;
	referencia: string | null;
	nome: string;
	grupo: string;
	unidade: string;
	preco: string | null;
	custo: string | null;
	ncm: string;
	cest: string | null;
	origem: number | null;
	mva: string | null;
	estoque: number | null;
	ippt: "P" | "T" | null;
	cfopSaida: string | null;
	cfopEntrada: string | null;
	cfopNfce: string | null;
	cst: string | null;
	csosn: string | null;
	aliquotas: AliquotasProdutoImportacao;
	erros: string[];
};

export type ResultadoValidacaoImportacaoProdutos = {
	produtos: LinhaImportacaoProduto[];
	totalProdutos: number;
	totalErros: number;
	errosGerais: string[];
};

function aliquotasVazias(): AliquotasProdutoImportacao {
	return {
		aliquotaicmsinterna: null,
		aliquotaicmsdiferencialentrada: null,
		aliquotareducaoicmsnfcesat: null,
		aliquotafcpnf: null,
		ultimaaliquotaicmsst: null,
		ultimaaliquotafcpst: null,
		aliquotapis: null,
		aliquotapisentrada: null,
		aliquotacofins: null,
		aliquotaconfinsentrada: null,
		aliquotapisconfinssaidapreco: null,
		aliquotapisconfinsentradapreco: null,
		aliquotaiss: null,
	};
}

export function normalizarTextoCabecalho(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/%/g, "")
		.replace(/[()]/g, "")
		.replace(/[_/]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function mapearColuna(cabecalho: string): ColunaImportacao | null {
	const normalizado = normalizarTextoCabecalho(cabecalho);

	if (normalizado === "codigo") return "codigo";
	if (["ean", "codigo de barras", "gtin", "barras"].includes(normalizado)) {
		return "ean";
	}
	if (normalizado === "referencia") return "referencia";
	if (["nome", "descricao", "produto"].includes(normalizado)) return "nome";
	if (normalizado === "grupo") return "grupo";
	if (["unidade", "und", "un", "sigla"].includes(normalizado)) return "unidade";
	if (["preco", "preco venda", "valor"].includes(normalizado)) return "preco";
	if (["custo", "preco custo", "custo aquisicao"].includes(normalizado)) {
		return "custo";
	}
	if (normalizado === "ncm") return "ncm";
	if (normalizado === "cest") return "cest";
	if (normalizado === "origem") return "origem";
	if (["mva", "percentual mva", "percentualmva"].includes(normalizado)) {
		return "mva";
	}
	if (["estoque", "saldo", "quantidade"].includes(normalizado))
		return "estoque";
	if (normalizado === "ippt") return "ippt";
	if (
		["cfop saida", "cfopsaida", "cfop nf", "cfop venda"].includes(normalizado)
	) {
		return "cfopsaida";
	}
	if (["cfop entrada", "cfopentrada"].includes(normalizado)) {
		return "cfopentrada";
	}
	if (
		["cfop nfce", "cfopsaidanfce", "cfop ecf", "cfop nfc e"].includes(
			normalizado,
		)
	) {
		return "cfopnfce";
	}
	if (["cst", "situacao tributaria"].includes(normalizado)) return "cst";
	if (["csosn", "situacao tributaria sn"].includes(normalizado)) return "csosn";

	for (const coluna of COLUNAS_ALIQUOTA_PRODUTO) {
		const cabecalhoNormalizado = normalizarTextoCabecalho(coluna.cabecalho);
		if (
			normalizado === cabecalhoNormalizado ||
			(coluna.aliases as readonly string[]).includes(normalizado) ||
			normalizado === coluna.campo
		) {
			return coluna.campo;
		}
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
		const quantidadeColunas = Math.max(linha.cellCount, 1);

		for (let coluna = 1; coluna <= quantidadeColunas; coluna++) {
			valores.push(converterCelulaParaTexto(linha.getCell(coluna).value));
		}

		linhas.push(valores);
	});

	return linhas;
}

function formatarPercentual(valor: string): string | null {
	const numero = parseNumeroDecimal(valor);
	if (numero === null) {
		return "__invalido__";
	}
	if (numero < 0 || numero > 999.99) {
		return "__invalido__";
	}
	return numero.toFixed(2);
}

function celula(
	linha: string[],
	indicePorColuna: Map<ColunaImportacao, number>,
	coluna: ColunaImportacao,
): string {
	const indice = indicePorColuna.get(coluna);
	if (indice === undefined) {
		return "";
	}
	return (linha[indice] ?? "").trim();
}

function validarLinha(
	valores: string[],
	indicePorColuna: Map<ColunaImportacao, number>,
	numeroLinha: number,
): LinhaImportacaoProduto {
	const erros: string[] = [];
	const nome = celula(valores, indicePorColuna, "nome");
	const grupo = celula(valores, indicePorColuna, "grupo");
	const unidade = celula(valores, indicePorColuna, "unidade");
	const precoTexto = celula(valores, indicePorColuna, "preco");
	const ncmBruto = celula(valores, indicePorColuna, "ncm");
	const ncm = ncmBruto.replace(/\D/g, "");

	if (!nome) {
		erros.push("Nome é obrigatório");
	} else if (nome.length > 120) {
		erros.push("Nome deve ter no máximo 120 caracteres");
	}

	if (!grupo) {
		erros.push("Grupo é obrigatório");
	}

	if (!unidade) {
		erros.push("Unidade é obrigatória");
	}

	let preco: string | null = null;
	if (!precoTexto) {
		erros.push("Preço é obrigatório");
	} else {
		const numeroPreco = parseNumeroDecimal(precoTexto);
		if (numeroPreco === null || numeroPreco <= 0) {
			erros.push("Preço deve ser maior que zero");
		} else {
			preco = numeroPreco.toFixed(2);
		}
	}

	if (!ncm) {
		erros.push("NCM é obrigatório");
	} else if (ncm.length > 10) {
		erros.push("NCM deve ter no máximo 10 caracteres");
	}

	const codigoTexto = celula(valores, indicePorColuna, "codigo");
	let codigo: number | null = null;
	if (codigoTexto) {
		const numeroCodigo = Number.parseInt(codigoTexto, 10);
		if (!Number.isInteger(numeroCodigo) || numeroCodigo <= 0) {
			erros.push("Código deve ser um número inteiro positivo");
		} else {
			codigo = numeroCodigo;
		}
	}

	const eanBruto = celula(valores, indicePorColuna, "ean").replace(/\D/g, "");
	const ean = eanBruto ? eanBruto.slice(0, 14) : null;

	const referenciaBruta = celula(valores, indicePorColuna, "referencia");
	const referencia = referenciaBruta ? referenciaBruta.slice(0, 60) : null;

	const custoTexto = celula(valores, indicePorColuna, "custo");
	let custo: string | null = null;
	if (custoTexto) {
		const numeroCusto = parseNumeroDecimal(custoTexto);
		if (numeroCusto === null || numeroCusto < 0) {
			erros.push("Custo inválido");
		} else {
			custo = numeroCusto.toFixed(2);
		}
	}

	const cest =
		celula(valores, indicePorColuna, "cest").replace(/\D/g, "") || null;

	const origemTexto = celula(valores, indicePorColuna, "origem");
	let origem: number | null = origemTexto ? null : 0;
	if (origemTexto) {
		const numeroOrigem = Number.parseInt(origemTexto, 10);
		if (
			!Number.isInteger(numeroOrigem) ||
			numeroOrigem < 0 ||
			numeroOrigem > 8
		) {
			erros.push("Origem deve ser um número de 0 a 8");
		} else {
			origem = numeroOrigem;
		}
	}

	const mvaTexto = celula(valores, indicePorColuna, "mva");
	let mva: string | null = null;
	if (mvaTexto) {
		mva = formatarPercentual(mvaTexto);
		if (mva === "__invalido__") {
			erros.push("MVA deve ser um percentual entre 0 e 999,99");
			mva = null;
		}
	}

	const estoqueTexto = celula(valores, indicePorColuna, "estoque");
	let estoque: number | null = null;
	if (estoqueTexto) {
		const numeroEstoque = parseNumeroDecimal(estoqueTexto);
		if (numeroEstoque === null || numeroEstoque < 0) {
			erros.push("Estoque não pode ser negativo");
		} else {
			estoque = numeroEstoque;
		}
	}

	const ipptTexto = celula(valores, indicePorColuna, "ippt")
		.trim()
		.toUpperCase();
	let ippt: "P" | "T" | null = ipptTexto ? null : "P";
	if (ipptTexto) {
		if (ipptTexto === "P" || ipptTexto === "T") {
			ippt = ipptTexto;
		} else {
			erros.push("IPPT deve ser P (próprio) ou T (terceiros)");
		}
	}

	const aliquotas = aliquotasVazias();
	for (const coluna of COLUNAS_ALIQUOTA_PRODUTO) {
		const texto = celula(valores, indicePorColuna, coluna.campo);
		if (!texto) {
			continue;
		}
		const percentual = formatarPercentual(texto);
		if (percentual === "__invalido__") {
			erros.push(`${coluna.cabecalho} inválida`);
			continue;
		}
		aliquotas[coluna.campo] = percentual;
	}

	return {
		linha: numeroLinha,
		codigo,
		ean,
		referencia,
		nome,
		grupo,
		unidade,
		preco,
		custo,
		ncm,
		cest,
		origem,
		mva,
		estoque,
		ippt,
		cfopSaida:
			celula(valores, indicePorColuna, "cfopsaida").replace(/\D/g, "") || null,
		cfopEntrada:
			celula(valores, indicePorColuna, "cfopentrada").replace(/\D/g, "") ||
			null,
		cfopNfce:
			celula(valores, indicePorColuna, "cfopnfce").replace(/\D/g, "") || null,
		cst: celula(valores, indicePorColuna, "cst").slice(0, 3) || null,
		csosn: celula(valores, indicePorColuna, "csosn").slice(0, 3) || null,
		aliquotas,
		erros,
	};
}

function marcarDuplicados(produtos: LinhaImportacaoProduto[]) {
	const vistoCodigo = new Map<number, number>();
	const vistoEan = new Map<string, number>();

	for (const produto of produtos) {
		if (produto.codigo != null) {
			const anterior = vistoCodigo.get(produto.codigo);
			if (anterior !== undefined) {
				const mensagem = `Código ${produto.codigo} duplicado no arquivo (linha ${anterior})`;
				produto.erros.push(mensagem);
			} else {
				vistoCodigo.set(produto.codigo, produto.linha);
			}
		}

		if (produto.ean) {
			const anterior = vistoEan.get(produto.ean);
			if (anterior !== undefined) {
				produto.erros.push(
					`EAN ${produto.ean} duplicado no arquivo (linha ${anterior})`,
				);
			} else {
				vistoEan.set(produto.ean, produto.linha);
			}
		}
	}
}

export async function validarArquivoImportacaoProdutos(
	formato: FormatoArquivoImportacao,
	conteudo: string,
): Promise<ResultadoValidacaoImportacaoProdutos> {
	const errosGerais: string[] = [];

	let linhas: string[][];

	try {
		linhas =
			formato === "csv"
				? extrairLinhasCsv(conteudo)
				: await extrairLinhasXlsx(conteudo);
	} catch {
		return {
			produtos: [],
			totalProdutos: 0,
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
			produtos: [],
			totalProdutos: 0,
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
		const nomesColunas: Record<(typeof COLUNAS_OBRIGATORIAS)[number], string> =
			{
				nome: "Nome",
				grupo: "Grupo",
				unidade: "Unidade",
				preco: "Preço",
				ncm: "NCM",
			};

		errosGerais.push(
			`Colunas obrigatórias ausentes: ${colunasAusentes
				.map((coluna) => nomesColunas[coluna])
				.join(", ")}.`,
		);
	}

	const produtos = linhasComConteudo
		.slice(1)
		.map((linha, indice) => validarLinha(linha, indicePorColuna, indice + 2));

	if (produtos.length === 0 && errosGerais.length === 0) {
		errosGerais.push("O arquivo não possui produtos.");
	}

	if (produtos.length > LIMITE_PRODUTOS_IMPORTACAO) {
		errosGerais.push(
			`O arquivo excede o limite de ${LIMITE_PRODUTOS_IMPORTACAO} produtos.`,
		);
	}

	marcarDuplicados(produtos);

	const totalErros = produtos.reduce(
		(total, produto) => total + produto.erros.length,
		0,
	);

	return {
		produtos,
		totalProdutos: produtos.length,
		totalErros,
		errosGerais,
	};
}

export function validarExtensaoArquivoProdutos(
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

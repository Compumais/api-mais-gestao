import { Buffer } from "node:buffer";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import type { FormatoArquivoImportacao } from "@/util/plano-contas-importacao.js";

export type { FormatoArquivoImportacao };

export const LIMITE_ENTIDADES_IMPORTACAO = 10000;

export const COLUNAS_CADASTRO_ENTIDADES = [
	{ campo: "nome", cabecalho: "Nome" },
	{ campo: "razaosocial", cabecalho: "Razão Social" },
	{ campo: "cnpjcpf", cabecalho: "CNPJ/CPF" },
	{ campo: "endereco", cabecalho: "Endereço" },
	{ campo: "tipopessoa", cabecalho: "Tipo de pessoa" },
	{ campo: "indiedest", cabecalho: "Indicador IE" },
	{ campo: "inscricaoestadual", cabecalho: "Inscrição estadual" },
	{ campo: "rg", cabecalho: "RG" },
	{ campo: "email", cabecalho: "E-mail" },
	{ campo: "telefone", cabecalho: "Telefone" },
	{ campo: "numeroendereco", cabecalho: "Nº" },
	{ campo: "complemento", cabecalho: "Complemento" },
	{ campo: "bairro", cabecalho: "Bairro" },
	{ campo: "cep", cabecalho: "CEP" },
	{ campo: "fax", cabecalho: "Fax" },
	{ campo: "nascimento", cabecalho: "Nascimento" },
	{ campo: "pais", cabecalho: "País" },
] as const;

export type CampoImportacaoEntidade =
	(typeof COLUNAS_CADASTRO_ENTIDADES)[number]["campo"];

export const CABECALHO_TEMPLATE_ENTIDADES = COLUNAS_CADASTRO_ENTIDADES.map(
	(coluna) => coluna.cabecalho,
);

export const COLUNAS_EXPORTACAO_ENTIDADES = [
	...CABECALHO_TEMPLATE_ENTIDADES,
	"Data cadastro",
] as const;

export type EntidadeImportacaoArquivo = {
	linha: number;
	nome: string;
	razaosocial: string | null;
	cnpjcpf: string;
	documento: string;
	endereco: string | null;
	tipopessoa: number | null;
	indiedest: number | null;
	inscricaoestadual: string | null;
	rg: string | null;
	email: string | null;
	telefone: string | null;
	numeroendereco: string | null;
	complemento: string | null;
	bairro: string | null;
	cep: string | null;
	fax: string | null;
	nascimento: string | null;
	pais: string | null;
	erros: string[];
};

export type ResultadoValidacaoImportacaoEntidades = {
	entidades: EntidadeImportacaoArquivo[];
	totalEntidades: number;
	totalErros: number;
	errosGerais: string[];
};

const ALIASES_COLUNA: Record<CampoImportacaoEntidade, string[]> = {
	nome: ["nome"],
	razaosocial: ["razao social", "razaosocial"],
	cnpjcpf: ["cnpj/cpf", "cnpjcpf", "cnpj", "cpf"],
	endereco: ["endereco"],
	tipopessoa: ["tipo de pessoa", "tipopessoa"],
	indiedest: ["indicador ie", "indiedest"],
	inscricaoestadual: ["inscricao estadual", "inscricaoestadual"],
	rg: ["rg"],
	email: ["e-mail", "email"],
	telefone: ["telefone"],
	numeroendereco: ["n", "no", "nº", "n°", "numero", "numero endereco"],
	complemento: ["complemento"],
	bairro: ["bairro"],
	cep: ["cep"],
	fax: ["fax"],
	nascimento: ["nascimento"],
	pais: ["pais"],
};

const COLUNAS_IGNORADAS = ["data cadastro", "criadoem"];

function normalizarTexto(valor: string): string {
	return valor
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();
}

function mapearColuna(
	cabecalho: string,
): CampoImportacaoEntidade | "ignorar" | null {
	const normalizado = normalizarTexto(cabecalho);
	if (!normalizado || COLUNAS_IGNORADAS.includes(normalizado)) {
		return normalizado ? "ignorar" : null;
	}

	for (const coluna of COLUNAS_CADASTRO_ENTIDADES) {
		if (ALIASES_COLUNA[coluna.campo].includes(normalizado)) {
			return coluna.campo;
		}
	}

	return null;
}

function textoOpcional(valor: string): string | null {
	const texto = valor.trim();
	return texto ? texto : null;
}

function converterTipoPessoa(valor: string): number | null | undefined {
	const normalizado = normalizarTexto(valor);
	if (!normalizado) return null;
	if (["0", "fisica", "pf", "f"].includes(normalizado)) return 0;
	if (["1", "juridica", "pj", "j"].includes(normalizado)) return 1;
	return undefined;
}

function converterIndIeDest(valor: string): number | null | undefined {
	const normalizado = normalizarTexto(valor);
	if (!normalizado) return null;
	if (
		normalizado === "1" ||
		normalizado.startsWith("1 ") ||
		normalizado.includes("contribuinte icms")
	) {
		if (normalizado.includes("isento")) return 2;
		return 1;
	}
	if (
		normalizado === "2" ||
		normalizado.startsWith("2 ") ||
		normalizado.includes("isento")
	) {
		return 2;
	}
	if (
		normalizado === "9" ||
		normalizado.startsWith("9 ") ||
		normalizado.includes("nao contribuinte")
	) {
		return 9;
	}
	return undefined;
}

function converterNascimento(valor: string): string | null | undefined {
	const texto = valor.trim();
	if (!texto) return null;

	const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

	const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (br) return `${br[3]}-${br[2]}-${br[1]}`;

	const instante = new Date(texto);
	if (!Number.isNaN(instante.getTime())) {
		return instante.toISOString().slice(0, 10);
	}

	return undefined;
}

function emailValido(valor: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
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
		const quantidadeColunas = Math.max(
			linha.cellCount,
			CABECALHO_TEMPLATE_ENTIDADES.length,
		);

		for (let coluna = 1; coluna <= quantidadeColunas; coluna++) {
			valores.push(converterCelulaParaTexto(linha.getCell(coluna).value));
		}

		linhas.push(valores);
	});

	return linhas;
}

export function validarExtensaoArquivoEntidades(
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

export async function validarArquivoImportacaoEntidades(
	formato: FormatoArquivoImportacao,
	conteudo: string,
): Promise<ResultadoValidacaoImportacaoEntidades> {
	const errosGerais: string[] = [];

	let linhas: string[][];
	try {
		linhas =
			formato === "csv"
				? extrairLinhasCsv(conteudo)
				: await extrairLinhasXlsx(conteudo);
	} catch {
		return {
			entidades: [],
			totalEntidades: 0,
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
			entidades: [],
			totalEntidades: 0,
			totalErros: 0,
			errosGerais: ["O arquivo está vazio."],
		};
	}

	const cabecalhos = linhasComConteudo[0] ?? [];
	const mapaColunas = new Map<CampoImportacaoEntidade, number>();

	cabecalhos.forEach((cabecalho, indice) => {
		const campo = mapearColuna(cabecalho);
		if (campo && campo !== "ignorar" && !mapaColunas.has(campo)) {
			mapaColunas.set(campo, indice);
		}
	});

	if (!mapaColunas.has("nome") || !mapaColunas.has("cnpjcpf")) {
		errosGerais.push(
			"O arquivo precisa das colunas Nome e CNPJ/CPF, iguais às do modelo de importação.",
		);
		return {
			entidades: [],
			totalEntidades: 0,
			totalErros: 0,
			errosGerais,
		};
	}

	const dados = linhasComConteudo.slice(1);
	if (dados.length > LIMITE_ENTIDADES_IMPORTACAO) {
		errosGerais.push(
			`O arquivo ultrapassa o limite de ${LIMITE_ENTIDADES_IMPORTACAO} registros.`,
		);
		return {
			entidades: [],
			totalEntidades: 0,
			totalErros: 0,
			errosGerais,
		};
	}

	const documentosVistos = new Map<string, number>();
	const entidades: EntidadeImportacaoArquivo[] = dados.map((linha, indice) => {
		const valor = (campo: CampoImportacaoEntidade) => {
			const posicao = mapaColunas.get(campo);
			return posicao === undefined ? "" : (linha[posicao] ?? "");
		};

		const erros: string[] = [];
		const nome = valor("nome").trim();
		const cnpjcpfBruto = valor("cnpjcpf").trim();
		const documento = cnpjcpfBruto.replace(/\D/g, "");

		if (!nome) {
			erros.push("Nome é obrigatório");
		}
		if (!documento) {
			erros.push("CNPJ/CPF é obrigatório");
		}

		const tipopessoa = converterTipoPessoa(valor("tipopessoa"));
		if (tipopessoa === undefined) {
			erros.push("Tipo de pessoa inválido (use Física, Jurídica, 0 ou 1)");
		}

		const indiedest = converterIndIeDest(valor("indiedest"));
		if (indiedest === undefined) {
			erros.push("Indicador IE inválido (use 1, 2 ou 9)");
		}

		const nascimento = converterNascimento(valor("nascimento"));
		if (nascimento === undefined) {
			erros.push("Nascimento inválido (use DD/MM/AAAA)");
		}

		const email = textoOpcional(valor("email"));
		if (email && !emailValido(email)) {
			erros.push("E-mail inválido");
		}

		if (documento) {
			const linhaAnterior = documentosVistos.get(documento);
			if (linhaAnterior) {
				erros.push(`CNPJ/CPF repetido na linha ${linhaAnterior}`);
			} else {
				documentosVistos.set(documento, indice + 2);
			}
		}

		return {
			linha: indice + 2,
			nome,
			razaosocial: textoOpcional(valor("razaosocial")),
			cnpjcpf: documento || cnpjcpfBruto,
			documento,
			endereco: textoOpcional(valor("endereco")),
			tipopessoa: tipopessoa ?? null,
			indiedest: indiedest ?? null,
			inscricaoestadual: textoOpcional(valor("inscricaoestadual")),
			rg: textoOpcional(valor("rg")),
			email,
			telefone: textoOpcional(valor("telefone")),
			numeroendereco: textoOpcional(valor("numeroendereco")),
			complemento: textoOpcional(valor("complemento")),
			bairro: textoOpcional(valor("bairro")),
			cep: textoOpcional(valor("cep")),
			fax: textoOpcional(valor("fax")),
			nascimento: nascimento ?? null,
			pais: textoOpcional(valor("pais")),
			erros,
		};
	});

	const totalErros = entidades.reduce(
		(total, entidade) => total + entidade.erros.length,
		0,
	);

	return {
		entidades,
		totalEntidades: entidades.length,
		totalErros,
		errosGerais,
	};
}

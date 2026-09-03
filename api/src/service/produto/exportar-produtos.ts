import { Buffer } from "node:buffer";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarTodosProdutosParaExportacao,
	type ProdutoParaExportacao,
} from "@/repositories/produtos-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import {
	CABECALHO_TEMPLATE_PRODUTOS,
	COLUNAS_ALIQUOTA_PRODUTO,
	COLUNAS_BASE_TEMPLATE_PRODUTOS,
	COLUNAS_FISCAIS_PRODUTO,
} from "@/util/produtos-importacao.js";

export type FormatoExportacaoProdutos = "csv" | "xlsx";

type ExportarProdutosParametros = {
	idempresa: string;
	idusuario: string;
	formato: FormatoExportacaoProdutos;
};

type ExportarProdutosResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
};

function normalizarValor(valor: unknown): string | number {
	if (valor == null) return "";
	if (typeof valor === "number" || typeof valor === "string") return valor;
	return String(valor);
}

function decimalImportacao(valor: unknown): string {
	const normalizado = normalizarValor(valor);
	return normalizado === "" ? "" : String(normalizado).replace(".", ",");
}

function valorBase(
	produto: ProdutoParaExportacao,
	campo: (typeof COLUNAS_BASE_TEMPLATE_PRODUTOS)[number]["campo"],
): string | number {
	switch (campo) {
		case "codigo":
			return normalizarValor(produto.codigo);
		case "ean":
			return normalizarValor(produto.ean);
		case "referencia":
			return normalizarValor(produto.referencia);
		case "nome":
			return normalizarValor(produto.nome);
		case "grupo":
			return normalizarValor(produto.grupo);
		case "unidade":
			return normalizarValor(produto.unidademedida);
		case "preco":
			return decimalImportacao(produto.preco);
		case "custo":
			return decimalImportacao(produto.custoaquisicao);
		case "ncm":
			return normalizarValor(produto.ncm || produto.ncmExportacao);
		case "cest":
			return normalizarValor(produto.cestExportacao ?? produto.cest);
		case "origem":
			return normalizarValor(produto.origem);
		case "mva":
			return decimalImportacao(produto.percentualmva);
		case "estoque":
			return normalizarValor(produto.quantidadepadrao);
	}
}

function valorFiscal(
	produto: ProdutoParaExportacao,
	campo: (typeof COLUNAS_FISCAIS_PRODUTO)[number]["campo"],
): string | number {
	const mapeamento = {
		cfopentrada: produto.cfopEntradaExportacao,
		tipoproduto: produto.tipoproduto,
		situacaotributariasnentrada: produto.situacaotributariasnentrada,
		cfopsaida: produto.cfopSaidaExportacao,
		cfopnfce: produto.cfopNfceExportacao,
		cst: produto.situacaotributaria,
		csosn: produto.situacaotributariasn,
		tributacaoespecial: produto.tributacaoespecial,
		tributacaosn: produto.tributacaosn,
		cstipientrada: produto.cstipientrada,
		cstipisaida: produto.cstipisaida,
		cstpisentrada: produto.cstpisentrada,
		cstcofinsentrada: produto.cstcofinsentrada,
		cstpis: produto.cstpis,
		cstcofins: produto.cstcofins,
	} satisfies Record<
		(typeof COLUNAS_FISCAIS_PRODUTO)[number]["campo"],
		unknown
	>;
	return normalizarValor(mapeamento[campo]);
}

function montarLinhas(produtos: ProdutoParaExportacao[]): Array<Array<string | number>> {
	return produtos.map((produto) => [
		...COLUNAS_BASE_TEMPLATE_PRODUTOS.map((coluna) =>
			valorBase(produto, coluna.campo),
		),
		...COLUNAS_FISCAIS_PRODUTO.map((coluna) =>
			valorFiscal(produto, coluna.campo),
		),
		...COLUNAS_ALIQUOTA_PRODUTO.map((coluna) =>
			decimalImportacao(produto[coluna.campo]),
		),
	]);
}

function neutralizarFormulaCsv(valor: string | number): string | number {
	if (typeof valor === "string" && /^[=+\-@\t\r]/.test(valor)) {
		return `'${valor}`;
	}
	return valor;
}

function gerarCsv(linhas: Array<Array<string | number>>): Buffer {
	const linhasSeguras = linhas.map((linha) => linha.map(neutralizarFormulaCsv));
	const conteudo = stringify(
		[CABECALHO_TEMPLATE_PRODUTOS, ...linhasSeguras],
		{ delimiter: ";" },
	);
	return Buffer.from(`\uFEFF${conteudo}`, "utf-8");
}

async function gerarXlsx(linhas: Array<Array<string | number>>): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const planilha = workbook.addWorksheet("Produtos");

	planilha.columns = CABECALHO_TEMPLATE_PRODUTOS.map((header, indice) => ({
			header,
			key: `col${indice}`,
			width: Math.min(35, Math.max(12, header.length + 2)),
		}));
	planilha.views = [{ state: "frozen", ySplit: 1 }];
	planilha.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: CABECALHO_TEMPLATE_PRODUTOS.length },
	};
	planilha.getRow(1).font = { bold: true };

	for (const linha of linhas) {
		planilha.addRow(linha);
	}

	planilha.getColumn(2).numFmt = "@";
	const primeiraColunaFiscal = COLUNAS_BASE_TEMPLATE_PRODUTOS.length + 1;
	for (
		let indice = primeiraColunaFiscal;
		indice <= CABECALHO_TEMPLATE_PRODUTOS.length;
		indice++
	) {
		planilha.getColumn(indice).numFmt = "@";
	}

	const conteudo = await workbook.xlsx.writeBuffer();
	return Buffer.from(conteudo);
}

export async function exportarProdutosService({
	idempresa,
	idusuario,
	formato,
}: ExportarProdutosParametros): Promise<
	HttpResponse<ExportarProdutosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const produtos = await listarTodosProdutosParaExportacao(idempresa);
	const linhas = montarLinhas(produtos);

	if (formato === "xlsx") {
		return httpOk({
			content: await gerarXlsx(linhas),
			contentType:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			filename: "produtos-para-importacao.xlsx",
		});
	}

	return httpOk({
		content: gerarCsv(linhas),
		contentType: "text/csv; charset=utf-8",
		filename: "produtos-para-importacao.csv",
	});
}

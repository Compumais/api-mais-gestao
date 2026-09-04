import { Buffer } from "node:buffer";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import type { HttpResponse } from "@/model/http-model.js";
import { httpOk } from "@/util/http-util.js";
import type { FormatoArquivoImportacao } from "@/util/plano-contas-importacao.js";
import {
	COLUNAS_ALIQUOTA_PRODUTO,
	COLUNAS_FISCAIS_PRODUTO,
} from "@/util/produtos-importacao.js";

type GerarTemplateProdutosResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
};

const CABECALHO_BASE = [
	"Código",
	"EAN",
	"Referência",
	"Nome",
	"Grupo",
	"Unidade",
	"Preço",
	"Custo",
	"NCM",
	"CEST",
	"Origem",
	"MVA",
	"Estoque",
	"Status",
];

const CABECALHO = [
	...CABECALHO_BASE,
	...COLUNAS_FISCAIS_PRODUTO.map((coluna) => coluna.cabecalho),
	...COLUNAS_ALIQUOTA_PRODUTO.map((coluna) => coluna.cabecalho),
];

const LINHA_EXEMPLO_BASE = [
	"1",
	"7891000055120",
	"REF01",
	"Refrigerante 2L",
	"BEBIDAS",
	"UN",
	"9,90",
	"5,50",
	"22021000",
	"",
	"0",
	"40,00",
	"10",
	"ativo",
];

const LINHA_EXEMPLO_FISCAL = COLUNAS_FISCAIS_PRODUTO.map(
	(coluna) => coluna.exemplo,
);

const LINHA_EXEMPLO_ALIQUOTAS = COLUNAS_ALIQUOTA_PRODUTO.map((coluna) => {
	if (coluna.campo === "aliquotaicmsinterna") return "18,00";
	if (coluna.campo === "aliquotapis") return "1,65";
	if (coluna.campo === "aliquotacofins") return "7,60";
	return "";
});

const LINHAS_EXEMPLO = [
	[...LINHA_EXEMPLO_BASE, ...LINHA_EXEMPLO_FISCAL, ...LINHA_EXEMPLO_ALIQUOTAS],
];

async function gerarXlsx(): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const planilha = workbook.addWorksheet("Produtos");

	planilha.columns = CABECALHO.map((header, indice) => ({
		header,
		key: `col${indice}`,
		width: indice === 3 ? 32 : 18,
	}));

	planilha.getRow(1).font = { bold: true };

	for (const linha of LINHAS_EXEMPLO) {
		planilha.addRow(linha);
	}

	planilha.getColumn(1).numFmt = "0";
	planilha.getColumn(2).numFmt = "@";

	const primeiraColunaFiscal = CABECALHO_BASE.length + 1;
	const ultimaColunaFiscal =
		CABECALHO_BASE.length + COLUNAS_FISCAIS_PRODUTO.length;
	for (
		let indice = primeiraColunaFiscal;
		indice <= ultimaColunaFiscal;
		indice++
	) {
		planilha.getColumn(indice).numFmt = "@";
	}

	const conteudo = await workbook.xlsx.writeBuffer();

	return Buffer.from(conteudo);
}

function gerarCsv(): Buffer {
	const conteudo = stringify([CABECALHO, ...LINHAS_EXEMPLO], {
		delimiter: ";",
	});

	return Buffer.from(`\uFEFF${conteudo}`, "utf-8");
}

export async function gerarTemplateProdutosService(
	formato: FormatoArquivoImportacao,
): Promise<HttpResponse<GerarTemplateProdutosResposta>> {
	if (formato === "xlsx") {
		return httpOk<GerarTemplateProdutosResposta>({
			content: await gerarXlsx(),
			contentType:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			filename: "modelo-produtos.xlsx",
		});
	}

	return httpOk<GerarTemplateProdutosResposta>({
		content: gerarCsv(),
		contentType: "text/csv; charset=utf-8",
		filename: "modelo-produtos.csv",
	});
}

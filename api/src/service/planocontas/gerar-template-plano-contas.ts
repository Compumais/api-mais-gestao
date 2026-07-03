import { Buffer } from "node:buffer";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import type { HttpResponse } from "@/model/http-model.js";
import { httpOk } from "@/util/http-util.js";
import type { FormatoArquivoImportacao } from "@/util/plano-contas-importacao.js";

type GerarTemplatePlanoContasResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
};

const CABECALHO = ["Código", "Descrição", "Tipo", "Ativo"];

const LINHAS_EXEMPLO = [
	["1", "Receitas", "E", "Sim"],
	["1 1", "Vendas de Produtos", "E", "Sim"],
	["1 2", "Prestação de Serviços", "E", "Sim"],
	["2", "Despesas", "S", "Sim"],
	["2 1", "Despesas Administrativas", "S", "Sim"],
	["2 1 1", "Aluguel", "S", "Sim"],
	["2 1 2", "Energia Elétrica", "S", "Sim"],
];

async function gerarXlsx(): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const planilha = workbook.addWorksheet("Plano de Contas");

	planilha.columns = [
		{ header: CABECALHO[0], key: "codigo", width: 15 },
		{ header: CABECALHO[1], key: "descricao", width: 40 },
		{ header: CABECALHO[2], key: "tipo", width: 10 },
		{ header: CABECALHO[3], key: "ativo", width: 10 },
	];

	planilha.getRow(1).font = { bold: true };

	for (const linha of LINHAS_EXEMPLO) {
		planilha.addRow(linha);
	}

	// Força o código como texto para o Excel não converter "1 1" ou "1" em número
	planilha.getColumn(1).numFmt = "@";

	const conteudo = await workbook.xlsx.writeBuffer();

	return Buffer.from(conteudo);
}

function gerarCsv(): Buffer {
	const conteudo = stringify([CABECALHO, ...LINHAS_EXEMPLO], {
		delimiter: ";",
	});

	// BOM para o Excel reconhecer a acentuação em UTF-8
	return Buffer.from(`\uFEFF${conteudo}`, "utf-8");
}

export async function gerarTemplatePlanoContasService(
	formato: FormatoArquivoImportacao,
): Promise<HttpResponse<GerarTemplatePlanoContasResposta>> {
	if (formato === "xlsx") {
		return httpOk<GerarTemplatePlanoContasResposta>({
			content: await gerarXlsx(),
			contentType:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			filename: "modelo-plano-de-contas.xlsx",
		});
	}

	return httpOk<GerarTemplatePlanoContasResposta>({
		content: gerarCsv(),
		contentType: "text/csv; charset=utf-8",
		filename: "modelo-plano-de-contas.csv",
	});
}

import { Buffer } from "node:buffer";
import ExcelJS from "exceljs";
import type { HttpResponse } from "@/model/http-model.js";
import { CONTENT_TYPE_CSV, gerarCsv } from "@/util/csv.js";
import {
	CABECALHO_TEMPLATE_ENTIDADES,
	type FormatoArquivoImportacao,
} from "@/util/entidades-importacao.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";

type GerarTemplateEntidadesParametros = {
	formato: FormatoArquivoImportacao;
	cliente?: number | undefined;
	fornecedor?: number | undefined;
};

type GerarTemplateEntidadesResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
};

const LINHA_EXEMPLO = [
	"João da Silva",
	"João da Silva",
	"39053344705",
	"Rua das Flores",
	"Física",
	"9 — Não Contribuinte",
	"",
	"",
	"joao@example.com",
	"34999999999",
	"100",
	"",
	"Centro",
	"38180000",
	"",
	"15/05/1990",
	"Brasil",
];

async function gerarXlsx(): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const planilha = workbook.addWorksheet("Cadastro");

	planilha.columns = CABECALHO_TEMPLATE_ENTIDADES.map((header, indice) => ({
		header,
		key: `col${indice}`,
		width: indice === 0 || indice === 1 ? 28 : 18,
	}));

	planilha.getRow(1).font = { bold: true };
	planilha.addRow(LINHA_EXEMPLO);
	planilha.getColumn(3).numFmt = "@";

	const conteudo = await workbook.xlsx.writeBuffer();
	return Buffer.from(conteudo);
}

function prefixoArquivo(cliente?: number, fornecedor?: number): string {
	if (fornecedor === 1 && cliente !== 1) return "fornecedores";
	return "clientes";
}

export async function gerarTemplateEntidadesService({
	formato,
	cliente,
	fornecedor,
}: GerarTemplateEntidadesParametros): Promise<
	HttpResponse<GerarTemplateEntidadesResposta>
> {
	if (cliente !== 1 && fornecedor !== 1) {
		return httpBadRequest("Informe se o modelo é de clientes ou fornecedores");
	}

	const prefixo = prefixoArquivo(cliente, fornecedor);

	if (formato === "xlsx") {
		return httpOk<GerarTemplateEntidadesResposta>({
			content: await gerarXlsx(),
			contentType:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			filename: `modelo-${prefixo}.xlsx`,
		});
	}

	return httpOk<GerarTemplateEntidadesResposta>({
		content: gerarCsv({
			colunas: [...CABECALHO_TEMPLATE_ENTIDADES],
			linhas: [LINHA_EXEMPLO],
		}),
		contentType: CONTENT_TYPE_CSV,
		filename: `modelo-${prefixo}.csv`,
	});
}

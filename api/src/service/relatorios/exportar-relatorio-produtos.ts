import { Buffer } from "node:buffer";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import type { FiltrosRelatorioProdutos } from "@/repositories/relatorios-produtos-repositories.js";
import { gerarPdfRelatorio } from "@/util/gerar-pdf-relatorio.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import {
	consultarRelatorioProdutosService,
	type RelatorioProdutosResposta,
} from "./consultar-relatorio-produtos.js";
import type { TipoRelatorioProduto } from "./produtos-catalogo.js";

export type FormatoExportacaoRelatorioProdutos = "csv" | "xlsx" | "pdf";

type ExportarRelatorioProdutosParams = FiltrosRelatorioProdutos & {
	idusuario: string;
	tipo: TipoRelatorioProduto;
	formato: FormatoExportacaoRelatorioProdutos;
};

type ExportarRelatorioProdutosResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
};

const LIMITE_EXPORTACAO = 10_000;

function celula(valor: string | number | null | undefined): string {
	if (valor == null) return "";
	return String(valor);
}

function montarLinhas(relatorio: RelatorioProdutosResposta): string[][] {
	return relatorio.data.map((linha) =>
		relatorio.colunas.map((coluna) => celula(linha[coluna.chave])),
	);
}

async function gerarXlsx(
	relatorio: RelatorioProdutosResposta,
): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet(relatorio.titulo.slice(0, 31));
	sheet.addRow(relatorio.colunas.map((coluna) => coluna.label));
	for (const linha of montarLinhas(relatorio)) {
		sheet.addRow(linha);
	}
	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer);
}

export async function exportarRelatorioProdutosService(
	params: ExportarRelatorioProdutosParams,
): Promise<HttpResponse<ExportarRelatorioProdutosResposta>> {
	const relatorio = await consultarRelatorioProdutosService({
		...params,
		page: 1,
		limit: LIMITE_EXPORTACAO,
	});
	if (!relatorio.success || !relatorio.body) {
		return relatorio.success
			? httpProibido()
			: (relatorio as HttpResponse<ExportarRelatorioProdutosResposta>);
	}

	const dados = relatorio.body;
	const filename = `relatorio-produtos-${params.tipo}.${params.formato}`;

	if (params.formato === "csv") {
		const content = stringify([
			dados.colunas.map((coluna) => coluna.label),
			...montarLinhas(dados),
		]);
		return httpOk({
			content: Buffer.from(content, "utf8"),
			contentType: "text/csv; charset=utf-8",
			filename,
		});
	}

	if (params.formato === "xlsx") {
		return httpOk({
			content: await gerarXlsx(dados),
			contentType:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			filename,
		});
	}

	const empresa = await buscarEmpresaPorId(params.idempresa);
	const pdf = await gerarPdfRelatorio({
		titulo: dados.titulo,
		empresaNome: empresa?.nome ?? "",
		empresaCnpj: empresa?.cnpj ?? "",
		periodoInicio: params.dataInicio ?? new Date().toISOString().slice(0, 10),
		periodoFim: params.dataFim ?? new Date().toISOString().slice(0, 10),
		colunas: dados.colunas.map((coluna) => ({
			label: coluna.label,
			width: 90,
		})),
		linhas: montarLinhas(dados),
		filename,
	});

	return httpOk({
		content: pdf.content,
		contentType: pdf.contentType,
		filename: pdf.filename,
	});
}

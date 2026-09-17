import { Buffer } from "node:buffer";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	FiltrosRelatorioNotasFiscais,
	LinhaRelatorioNotaFiscal,
} from "@/model/relatorio-notas-fiscais-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { gerarPdfRelatorio } from "@/util/gerar-pdf-relatorio.js";
import { protegerFormulaPlanilha } from "./exportar-relatorio-produtos.service.js";
import { listarRelatorioNotasFiscaisService } from "./listar-relatorio-notas-fiscais.service.js";

export type ArquivoRelatorioNotasFiscais = {
	content: Buffer;
	contentType: string;
	filename: string;
};

const CABECALHOS = [
	"Data/hora",
	"Tipo",
	"Modelo",
	"Série",
	"Número/faixa",
	"Chave/protocolo",
	"Destinatário",
	"Valor total",
	"Status",
	"Ambiente",
];

function valorSeguro(valor: string | number | null) {
	return protegerFormulaPlanilha(valor);
}

function linhaExportacao(linha: LinhaRelatorioNotaFiscal) {
	const numero =
		linha.numeroInicial === linha.numeroFinal
			? linha.numeroInicial
			: `${linha.numeroInicial ?? ""}-${linha.numeroFinal ?? ""}`;
	return [
		valorSeguro(linha.dataHora),
		linha.tipo === "INUTILIZACAO" ? "Inutilização" : "Nota fiscal",
		linha.modelo,
		valorSeguro(linha.serie),
		valorSeguro(numero),
		valorSeguro(linha.chave ?? linha.protocolo),
		valorSeguro(linha.destinatario),
		linha.valorTotal == null ? "" : Number(linha.valorTotal),
		linha.status,
		linha.ambienteLabel,
	];
}

function nomeArquivo(extensao: string): string {
	return `relatorio-notas-fiscais-${new Date().toISOString().slice(0, 10)}.${extensao}`;
}

type ExportarRelatorioNotasFiscaisParametros = {
	idusuario: string;
	filtros: FiltrosRelatorioNotasFiscais;
	formato: "csv" | "xlsx" | "pdf";
};

export async function exportarRelatorioNotasFiscaisService({
	idusuario,
	filtros,
	formato,
}: ExportarRelatorioNotasFiscaisParametros): Promise<
	HttpResponse<ArquivoRelatorioNotasFiscais>
> {
	const resultado = await listarRelatorioNotasFiscaisService({
		idusuario,
		filtros: { ...filtros, page: 1, limit: 50_000 },
	});
	if (!resultado.success) return resultado;
	if (!resultado.body) {
		throw new Error("Relatório de notas fiscais retornado sem conteúdo");
	}

	const linhas = resultado.body.data.map(linhaExportacao);

	if (formato === "csv") {
		const csv = stringify([CABECALHOS, ...linhas], {
			delimiter: ";",
			quoted: true,
			record_delimiter: "windows",
		});
		return {
			success: true,
			status: 200,
			body: {
				content: Buffer.from(`\uFEFF${csv}`, "utf8"),
				contentType: "text/csv; charset=utf-8",
				filename: nomeArquivo("csv"),
			},
		};
	}

	if (formato === "xlsx") {
		const workbook = new ExcelJS.Workbook();
		workbook.creator = "Mais Gestão";
		const worksheet = workbook.addWorksheet("Notas fiscais");
		worksheet.addRow(CABECALHOS);
		for (const linha of linhas) worksheet.addRow(linha);
		worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
		worksheet.getRow(1).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFB45309" },
		};
		worksheet.columns.forEach((coluna, indice) => {
			const maior = Math.max(
				CABECALHOS[indice]?.length ?? 10,
				...linhas
					.slice(0, 1000)
					.map((linha) => String(linha[indice] ?? "").length),
			);
			coluna.width = Math.min(Math.max(maior + 2, 10), 48);
		});
		worksheet.autoFilter = {
			from: { row: 1, column: 1 },
			to: { row: 1, column: CABECALHOS.length },
		};
		const content = await workbook.xlsx.writeBuffer();
		return {
			success: true,
			status: 200,
			body: {
				content: Buffer.from(content),
				contentType:
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				filename: nomeArquivo("xlsx"),
			},
		};
	}

	const empresa = await buscarEmpresaPorId(filtros.idempresa);
	const resumo = resultado.body.resumo;
	const arquivo = await gerarPdfRelatorio({
		titulo: "Relatório de Notas Fiscais",
		empresaNome: empresa?.nome ?? "Empresa",
		empresaCnpj: empresa?.cnpj ?? "",
		periodoInicio: filtros.dataInicio,
		periodoFim: filtros.dataFim,
		colunas: CABECALHOS.map((label) => ({
			label,
			width: label === "Destinatário" ? 110 : 75,
			align: label === "Valor total" ? ("right" as const) : ("left" as const),
		})),
		linhas: linhas.map((linha) => linha.map(String)),
		resumoLinhas: [
			`Total: ${resumo.total}`,
			`Emitidas/pendentes: ${resumo.porStatus.emitidasPendentes}`,
			`Autorizadas: ${resumo.porStatus.autorizadas}`,
			`Canceladas: ${resumo.porStatus.canceladas}`,
			`Inutilizadas: ${resumo.porStatus.inutilizadas}`,
			`Produção: ${resumo.porAmbiente.producao}`,
			`Homologação: ${resumo.porAmbiente.homologacao}`,
			`Ambiente não informado: ${resumo.porAmbiente.naoInformado}`,
		],
		filename: nomeArquivo("pdf"),
	});
	return { success: true, status: 200, body: arquivo };
}

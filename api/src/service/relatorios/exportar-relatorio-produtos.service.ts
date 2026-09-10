import { Buffer } from "node:buffer";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import type {
	FiltrosRelatorioProdutos,
	TipoRelatorioProdutos,
	ValorRelatorio,
} from "@/model/relatorio-produtos-model.js";
import { gerarPdfRelatorio } from "@/util/gerar-pdf-relatorio.js";
import {
	buscarEmpresaRelatorio,
	gerarRelatorioProdutos,
} from "./relatorio-produtos.service.js";

export type FormatoExportacaoRelatorioProdutos = "csv" | "xlsx" | "pdf";

export type ArquivoRelatorioProdutos = {
	content: Buffer;
	contentType: string;
	filename: string;
};

export function protegerFormulaPlanilha(
	valor: ValorRelatorio | undefined,
): string | number {
	if (valor == null) return "";
	if (typeof valor === "number") return valor;
	return /^[\s]*[=+\-@]/.test(valor) ? `'${valor}` : valor;
}

function nomeArquivo(tipo: TipoRelatorioProdutos, extensao: string): string {
	const data = new Date().toISOString().slice(0, 10);
	return `relatorio-produtos-${tipo}-${data}.${extensao}`;
}

export async function exportarRelatorioProdutos(params: {
	tipo: TipoRelatorioProdutos;
	filtros: FiltrosRelatorioProdutos;
	idusuario: string;
	formato: FormatoExportacaoRelatorioProdutos;
}): Promise<ArquivoRelatorioProdutos> {
	const relatorio = await gerarRelatorioProdutos({
		tipo: params.tipo,
		idusuario: params.idusuario,
		filtros: { ...params.filtros, page: 1, limit: 50_000 },
	});
	const cabecalhos = relatorio.colunas.map((coluna) => coluna.label);
	const linhas = relatorio.data.map((linha) =>
		relatorio.colunas.map((coluna) =>
			protegerFormulaPlanilha(linha[coluna.chave]),
		),
	);

	if (params.formato === "csv") {
		const csv = stringify([cabecalhos, ...linhas], {
			delimiter: ";",
			quoted: true,
			record_delimiter: "windows",
		});
		return {
			content: Buffer.from(`\uFEFF${csv}`, "utf8"),
			contentType: "text/csv; charset=utf-8",
			filename: nomeArquivo(params.tipo, "csv"),
		};
	}

	if (params.formato === "xlsx") {
		const workbook = new ExcelJS.Workbook();
		workbook.creator = "Mais Gestão";
		const worksheet = workbook.addWorksheet("Produtos");
		worksheet.addRow(cabecalhos);
		for (const linha of linhas) worksheet.addRow(linha);
		worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
		worksheet.getRow(1).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFDC2626" },
		};
		worksheet.columns.forEach((coluna, indice) => {
			const maior = Math.max(
				cabecalhos[indice]?.length ?? 10,
				...linhas
					.slice(0, 1000)
					.map((linha) => String(linha[indice] ?? "").length),
			);
			coluna.width = Math.min(Math.max(maior + 2, 10), 45);
		});
		worksheet.autoFilter = {
			from: { row: 1, column: 1 },
			to: { row: 1, column: Math.max(cabecalhos.length, 1) },
		};
		const conteudo = await workbook.xlsx.writeBuffer();
		return {
			content: Buffer.from(conteudo),
			contentType:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			filename: nomeArquivo(params.tipo, "xlsx"),
		};
	}

	const empresa = await buscarEmpresaRelatorio(params.filtros.idempresa);
	const filtrosPeriodo =
		params.filtros.dataInicio && params.filtros.dataFim
			? {
					periodoInicio: params.filtros.dataInicio,
					periodoFim: params.filtros.dataFim,
				}
			: {
					periodoLabel: `Filtros: ${
						[
							params.filtros.q && `busca=${params.filtros.q}`,
							params.filtros.situacao && `situação=${params.filtros.situacao}`,
							params.filtros.pendencia &&
								`pendência=${params.filtros.pendencia}`,
						]
							.filter(Boolean)
							.join("; ") || "sem período informado"
					}`,
				};
	return gerarPdfRelatorio({
		titulo: relatorio.titulo,
		empresaNome: empresa.nome,
		empresaCnpj: empresa.cnpj,
		...filtrosPeriodo,
		colunas: relatorio.colunas.map((coluna) => ({
			label: coluna.label,
			width: Math.max(65, Math.min(150, coluna.label.length * 8)),
			align:
				coluna.tipo === "numero" ||
				coluna.tipo === "moeda" ||
				coluna.tipo === "percentual"
					? "right"
					: "left",
		})),
		linhas: linhas.map((linha) => linha.map(String)),
		resumoLinhas: [
			...Object.entries(relatorio.resumo).map(
				([chave, valor]) => `${chave}: ${valor}`,
			),
			...(relatorio.avisos ?? []).map((aviso) => `Aviso: ${aviso}`),
		],
		filename: nomeArquivo(params.tipo, "pdf"),
	});
}

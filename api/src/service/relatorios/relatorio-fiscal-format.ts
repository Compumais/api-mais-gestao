import type { RelatorioFiscalNotaItem } from "@/repositories/nota-fiscal-repositories.js";
import {
	gerarPdfRelatorio,
	type ColunaPdfRelatorio,
} from "@/util/gerar-pdf-relatorio.js";

export type FormatoRelatorioFiscal = "pdf" | "txt" | "html";

export type RelatorioFiscalOutput = {
	content: string | Buffer;
	contentType: string;
	filename: string;
};

export type GerarRelatorioFiscalBaseParams = {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	formato: FormatoRelatorioFiscal;
	titulo: string;
	prefixoArquivo: string;
	empresaNome: string;
	empresaCnpj: string;
	notas: RelatorioFiscalNotaItem[];
	resumoLinhas?: string[];
	colunas: ColunaPdfRelatorio[];
	montarLinha: (nota: RelatorioFiscalNotaItem) => string[];
};

export const formatCurrency = (value: number): string =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);

export const formatDate = (dateStr: string | null): string =>
	dateStr ? new Date(`${dateStr}T12:00:00`).toLocaleDateString("pt-BR") : "-";

export const parseDecimal = (value: string | null | undefined): number => {
	if (value == null || value === "") return 0;
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

export function classificarDocumentoFiscal(
	nota: RelatorioFiscalNotaItem,
): string {
	if (nota.modelo === "65") return "NFC-e";
	if (nota.tipoorigem === 0) return "NF-e Compra";
	return "NF-e Venda";
}

export function obterNumeroDocumento(nota: RelatorioFiscalNotaItem): string {
	return nota.numeronotafiscal ?? nota.numero ?? "-";
}

export function calcularTotaisFiscais(notas: RelatorioFiscalNotaItem[]) {
	return notas.reduce(
		(acc, nota) => {
			acc.valor += parseDecimal(nota.valortotalnota);
			acc.baseIcms += parseDecimal(nota.baseicms);
			acc.icms += parseDecimal(nota.icms);
			acc.pis += parseDecimal(nota.pis);
			acc.cofins += parseDecimal(nota.cofins);
			return acc;
		},
		{ valor: 0, baseIcms: 0, icms: 0, pis: 0, cofins: 0 },
	);
}

export async function gerarRelatorioFiscal(
	params: GerarRelatorioFiscalBaseParams,
): Promise<RelatorioFiscalOutput> {
	const linhas = params.notas.map(params.montarLinha);

	switch (params.formato) {
		case "txt":
			return gerarTxt(params, linhas);
		case "html":
			return gerarHtml(params, linhas);
		case "pdf":
			return gerarPdf(params, linhas);
		default:
			throw new Error(`Formato não suportado: ${params.formato}`);
	}
}

function gerarTxt(
	params: GerarRelatorioFiscalBaseParams,
	linhas: string[][],
): RelatorioFiscalOutput {
	let conteudo = "=".repeat(120) + "\n";
	conteudo += `${params.titulo.toUpperCase()}\n`;
	conteudo += "=".repeat(120) + "\n\n";
	conteudo += `Empresa: ${params.empresaNome}\n`;
	conteudo += `CNPJ: ${params.empresaCnpj}\n`;
	conteudo += `Período: ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}\n`;
	conteudo += `Emitido em: ${new Date().toLocaleString("pt-BR")}\n\n`;

	if (params.resumoLinhas?.length) {
		for (const linha of params.resumoLinhas) {
			conteudo += `${linha}\n`;
		}
		conteudo += "\n";
	}

	conteudo += params.colunas.map((c) => c.label.padEnd(14)).join("") + "\n";
	conteudo += "-".repeat(120) + "\n";

	for (const linha of linhas) {
		conteudo +=
			linha.map((celula, i) => String(celula).slice(0, 14).padEnd(14)).join("") +
			"\n";
	}

	const totais = calcularTotaisFiscais(params.notas);
	conteudo += "-".repeat(120) + "\n";
	conteudo += `TOTAL GERAL: ${formatCurrency(totais.valor)} | ICMS: ${formatCurrency(totais.icms)}\n`;

	return {
		content: conteudo,
		contentType: "text/plain; charset=utf-8",
		filename: `${params.prefixoArquivo}-${params.dataInicio}-${params.dataFim}.txt`,
	};
}

function gerarHtml(
	params: GerarRelatorioFiscalBaseParams,
	linhas: string[][],
): RelatorioFiscalOutput {
	const headerCells = params.colunas
		.map(
			(c) =>
				`<th style="text-align:${c.align === "right" ? "right" : "left"}">${c.label}</th>`,
		)
		.join("");

	const bodyRows = linhas
		.map(
			(linha) =>
				`<tr>${linha
					.map(
						(celula, i) =>
							`<td style="text-align:${params.colunas[i]?.align === "right" ? "right" : "left"}">${celula}</td>`,
					)
					.join("")}</tr>`,
		)
		.join("");

	const totais = calcularTotaisFiscais(params.notas);
	const resumoHtml =
		params.resumoLinhas
			?.map((l) => `<p><strong>${l}</strong></p>`)
			.join("") ?? "";

	const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${params.titulo}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px; }
    .info { margin: 16px 0; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th { background: #dc2626; color: #fff; padding: 8px; }
    td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9fafb; }
  </style>
</head>
<body>
  <h1>${params.titulo}</h1>
  <div class="info">
    <p><strong>Empresa:</strong> ${params.empresaNome}</p>
    <p><strong>CNPJ:</strong> ${params.empresaCnpj}</p>
    <p><strong>Período:</strong> ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}</p>
    ${resumoHtml}
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <p style="margin-top:16px"><strong>Total geral:</strong> ${formatCurrency(totais.valor)} | <strong>ICMS:</strong> ${formatCurrency(totais.icms)}</p>
</body>
</html>`;

	return {
		content: html,
		contentType: "text/html; charset=utf-8",
		filename: `${params.prefixoArquivo}-${params.dataInicio}-${params.dataFim}.html`,
	};
}

async function gerarPdf(
	params: GerarRelatorioFiscalBaseParams,
	linhas: string[][],
): Promise<RelatorioFiscalOutput> {
	const pdf = await gerarPdfRelatorio({
		titulo: params.titulo,
		empresaNome: params.empresaNome,
		empresaCnpj: params.empresaCnpj,
		periodoInicio: params.dataInicio,
		periodoFim: params.dataFim,
		colunas: params.colunas,
		linhas,
		resumoLinhas: params.resumoLinhas,
		filename: `${params.prefixoArquivo}-${params.dataInicio}-${params.dataFim}.pdf`,
	});

	return pdf;
}

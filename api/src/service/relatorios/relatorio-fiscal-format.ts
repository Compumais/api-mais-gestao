import type {
	RelatorioFiscalNotaComProdutos,
	RelatorioFiscalNotaItem,
	RelatorioFiscalProdutoItem,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	type ColunaPdfRelatorio,
	gerarPdfRelatorio,
	gerarPdfRelatorioAgrupado,
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
	notas: RelatorioFiscalNotaItem[] | RelatorioFiscalNotaComProdutos[];
	resumoLinhas?: string[];
	colunas: ColunaPdfRelatorio[];
	montarLinha: (nota: RelatorioFiscalNotaItem) => string[];
	exibirProdutos?: boolean;
};

export const COLUNAS_PRODUTO_RELATORIO_FISCAL: ColunaPdfRelatorio[] = [
	{ label: "Código", width: 50 },
	{ label: "Produto", width: 180 },
	{ label: "Qtd", width: 45, align: "right" },
	{ label: "Un", width: 30 },
	{ label: "Unitário", width: 65, align: "right" },
	{ label: "Total", width: 65, align: "right" },
	{ label: "CFOP", width: 40 },
	{ label: "Base ICMS", width: 65, align: "right" },
	{ label: "ICMS", width: 50, align: "right" },
];

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

export const formatNumber = (value: number, maxDecimals = 3): string =>
	new Intl.NumberFormat("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: maxDecimals,
	}).format(value);

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

export function anexarProdutosNasNotas(
	notas: RelatorioFiscalNotaItem[],
	produtos: RelatorioFiscalProdutoItem[],
): RelatorioFiscalNotaComProdutos[] {
	const produtosPorNota = new Map<string, RelatorioFiscalProdutoItem[]>();

	for (const produto of produtos) {
		const lista = produtosPorNota.get(produto.idnotafiscal) ?? [];
		lista.push(produto);
		produtosPorNota.set(produto.idnotafiscal, lista);
	}

	return notas.map((nota) => ({
		...nota,
		produtos: produtosPorNota.get(nota.id) ?? [],
	}));
}

export function montarCabecalhoDocumento(
	colunas: ColunaPdfRelatorio[],
	valores: string[],
): string {
	return colunas
		.map((coluna, indice) => `${coluna.label}: ${valores[indice] ?? "-"}`)
		.join("  •  ");
}

export function montarLinhaProdutoRelatorio(
	produto: RelatorioFiscalProdutoItem,
): string[] {
	return [
		produto.codigo ?? "-",
		produto.descricao ?? "-",
		formatNumber(parseDecimal(produto.quantidade)),
		produto.unidade ?? "-",
		formatCurrency(parseDecimal(produto.precounitario)),
		formatCurrency(parseDecimal(produto.total)),
		produto.cfop ?? "-",
		formatCurrency(parseDecimal(produto.baseicms)),
		formatCurrency(parseDecimal(produto.icms)),
	];
}

function obterProdutosDaNota(
	nota: RelatorioFiscalNotaItem | RelatorioFiscalNotaComProdutos,
): RelatorioFiscalProdutoItem[] {
	if ("produtos" in nota && Array.isArray(nota.produtos)) {
		return nota.produtos;
	}
	return [];
}

export async function gerarRelatorioFiscal(
	params: GerarRelatorioFiscalBaseParams,
): Promise<RelatorioFiscalOutput> {
	const linhas = params.notas.map(params.montarLinha);

	switch (params.formato) {
		case "txt":
			return params.exibirProdutos
				? gerarTxtComProdutos(params, linhas)
				: gerarTxt(params, linhas);
		case "html":
			return params.exibirProdutos
				? gerarHtmlComProdutos(params, linhas)
				: gerarHtml(params, linhas);
		case "pdf":
			return params.exibirProdutos
				? gerarPdfComProdutos(params, linhas)
				: gerarPdf(params, linhas);
		default:
			throw new Error(`Formato não suportado: ${params.formato}`);
	}
}

function cabecalhoArquivoTxt(params: GerarRelatorioFiscalBaseParams): string {
	let conteudo = `${"=".repeat(120)}\n`;
	conteudo += `${params.titulo.toUpperCase()}\n`;
	conteudo += `${"=".repeat(120)}\n\n`;
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

	return conteudo;
}

function rodapeTotais(params: GerarRelatorioFiscalBaseParams): string {
	const totais = calcularTotaisFiscais(params.notas);
	return `TOTAL GERAL: ${formatCurrency(totais.valor)} | ICMS: ${formatCurrency(totais.icms)}\n`;
}

function gerarTxt(
	params: GerarRelatorioFiscalBaseParams,
	linhas: string[][],
): RelatorioFiscalOutput {
	let conteudo = cabecalhoArquivoTxt(params);
	conteudo += `${params.colunas.map((c) => c.label.padEnd(14)).join("")}\n`;
	conteudo += `${"-".repeat(120)}\n`;

	for (const linha of linhas) {
		conteudo +=
			linha.map((celula) => String(celula).slice(0, 14).padEnd(14)).join("") +
			"\n";
	}

	conteudo += `${"-".repeat(120)}\n`;
	conteudo += rodapeTotais(params);

	return {
		content: conteudo,
		contentType: "text/plain; charset=utf-8",
		filename: `${params.prefixoArquivo}-${params.dataInicio}-${params.dataFim}.txt`,
	};
}

const LARGURAS_TXT_PRODUTO = [10, 40, 10, 6, 16, 16, 8, 14, 12] as const;

function formatarLinhaTxtProduto(celulas: string[]): string {
	return celulas
		.map((celula, indice) => {
			const largura = LARGURAS_TXT_PRODUTO[indice] ?? 14;
			return String(celula).slice(0, largura).padEnd(largura);
		})
		.join("");
}

function gerarTxtComProdutos(
	params: GerarRelatorioFiscalBaseParams,
	linhas: string[][],
): RelatorioFiscalOutput {
	let conteudo = cabecalhoArquivoTxt(params);
	const labelsProduto = formatarLinhaTxtProduto(
		COLUNAS_PRODUTO_RELATORIO_FISCAL.map((coluna) => coluna.label),
	);

	for (let i = 0; i < params.notas.length; i++) {
		const nota = params.notas[i];
		const linhaDocumento = linhas[i];
		if (!nota || !linhaDocumento) continue;

		conteudo += `${"-".repeat(120)}\n`;
		conteudo += `${montarCabecalhoDocumento(params.colunas, linhaDocumento)}\n`;
		conteudo += `  ${labelsProduto}\n`;

		const produtos = obterProdutosDaNota(nota);
		if (produtos.length === 0) {
			conteudo += "  Sem produtos neste documento\n\n";
			continue;
		}

		for (const produto of produtos) {
			conteudo += `  ${formatarLinhaTxtProduto(montarLinhaProdutoRelatorio(produto))}\n`;
		}
		conteudo += "\n";
	}

	conteudo += `${"-".repeat(120)}\n`;
	conteudo += rodapeTotais(params);

	return {
		content: conteudo,
		contentType: "text/plain; charset=utf-8",
		filename: `${params.prefixoArquivo}-${params.dataInicio}-${params.dataFim}.txt`,
	};
}

function estilosHtmlBase(): string {
	return `body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px; }
    .info { margin: 16px 0; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th { background: #dc2626; color: #fff; padding: 8px; }
    td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9fafb; }
    .documento { margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .documento-cabecalho { background: #991b1b; color: #fff; padding: 10px 12px; font-size: 12px; }
    .documento table { margin: 0; }
    .documento th { background: #fee2e2; color: #7f1d1d; }
    .sem-produtos { padding: 10px 12px; color: #6b7280; font-size: 12px; }`;
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
		params.resumoLinhas?.map((l) => `<p><strong>${l}</strong></p>`).join("") ??
		"";

	const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${params.titulo}</title>
  <style>
    ${estilosHtmlBase()}
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

function gerarHtmlComProdutos(
	params: GerarRelatorioFiscalBaseParams,
	linhas: string[][],
): RelatorioFiscalOutput {
	const headerCells = COLUNAS_PRODUTO_RELATORIO_FISCAL.map(
		(c) =>
			`<th style="text-align:${c.align === "right" ? "right" : "left"}">${c.label}</th>`,
	).join("");

	const documentosHtml = params.notas
		.map((nota, indice) => {
			const linhaDocumento = linhas[indice] ?? [];
			const produtos = obterProdutosDaNota(nota);
			const corpo =
				produtos.length === 0
					? `<p class="sem-produtos">Sem produtos neste documento</p>`
					: `<table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${produtos
			.map((produto) => {
				const celulas = montarLinhaProdutoRelatorio(produto);
				return `<tr>${celulas
					.map(
						(celula, i) =>
							`<td style="text-align:${COLUNAS_PRODUTO_RELATORIO_FISCAL[i]?.align === "right" ? "right" : "left"}">${celula}</td>`,
					)
					.join("")}</tr>`;
			})
			.join("")}</tbody>
  </table>`;

			return `<section class="documento">
    <div class="documento-cabecalho">${montarCabecalhoDocumento(params.colunas, linhaDocumento)}</div>
    ${corpo}
  </section>`;
		})
		.join("");

	const totais = calcularTotaisFiscais(params.notas);
	const resumoHtml =
		params.resumoLinhas?.map((l) => `<p><strong>${l}</strong></p>`).join("") ??
		"";

	const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${params.titulo}</title>
  <style>
    ${estilosHtmlBase()}
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
  ${documentosHtml}
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
	return gerarPdfRelatorio({
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
}

async function gerarPdfComProdutos(
	params: GerarRelatorioFiscalBaseParams,
	linhas: string[][],
): Promise<RelatorioFiscalOutput> {
	return gerarPdfRelatorioAgrupado({
		titulo: params.titulo,
		empresaNome: params.empresaNome,
		empresaCnpj: params.empresaCnpj,
		periodoInicio: params.dataInicio,
		periodoFim: params.dataFim,
		colunas: COLUNAS_PRODUTO_RELATORIO_FISCAL,
		resumoLinhas: params.resumoLinhas,
		filename: `${params.prefixoArquivo}-${params.dataInicio}-${params.dataFim}.pdf`,
		textoVazio: "Sem produtos neste documento",
		secoes: params.notas.map((nota, indice) => ({
			cabecalho: montarCabecalhoDocumento(params.colunas, linhas[indice] ?? []),
			linhas: obterProdutosDaNota(nota).map(montarLinhaProdutoRelatorio),
		})),
	});
}

import type { FluxoCaixaItem } from "@/repositories/relatorios-repositories.js";
import { buscarDadosFluxoCaixa } from "@/repositories/relatorios-repositories.js";

export interface GerarRelatorioFluxoCaixaParams {
	idempresa: string;
	dataInicio: string; // YYYY-MM-DD
	dataFim: string; // YYYY-MM-DD
	formato: "pdf" | "txt" | "html";
}

export async function gerarRelatorioFluxoCaixa(
	params: GerarRelatorioFluxoCaixaParams,
): Promise<{ content: string; contentType: string; filename: string }> {
	const dados = await buscarDadosFluxoCaixa({
		idempresa: params.idempresa,
		dataInicio: params.dataInicio,
		dataFim: params.dataFim,
	});

	switch (params.formato) {
		case "txt":
			return gerarRelatorioTXT(dados, params);
		case "html":
			return gerarRelatorioHTML(dados, params);
		case "pdf":
			return gerarRelatorioPDF(dados, params);
		default:
			throw new Error(`Formato não suportado: ${params.formato}`);
	}
}

function gerarRelatorioTXT(
	dados: FluxoCaixaItem[],
	params: GerarRelatorioFluxoCaixaParams,
): { content: string; contentType: string; filename: string } {
	const formatCurrency = (value: number): string => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(value);
	};

	const formatDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("pt-BR");
	};

	let relatorio = "=".repeat(80) + "\n";
	relatorio += "RELATÓRIO DE FLUXO DE CAIXA\n";
	relatorio += "=".repeat(80) + "\n\n";
	relatorio += `Período: ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}\n`;
	relatorio += `Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}\n\n`;
	relatorio += "-".repeat(80) + "\n";
	relatorio +=
		"Data".padEnd(12) +
		"Entradas".padStart(18) +
		"Saídas".padStart(18) +
		"Saldo".padStart(18) +
		"Saldo Acum.".padStart(18) +
		"\n";
	relatorio += "-".repeat(80) + "\n";

	let totalEntradas = 0;
	let totalSaidas = 0;

	for (const item of dados) {
		totalEntradas += item.entradas;
		totalSaidas += item.saidas;
		relatorio +=
			formatDate(item.data).padEnd(12) +
			formatCurrency(item.entradas).padStart(18) +
			formatCurrency(item.saidas).padStart(18) +
			formatCurrency(item.saldo).padStart(18) +
			formatCurrency(item.saldoAcumulado).padStart(18) +
			"\n";
	}

	relatorio += "-".repeat(80) + "\n";
	relatorio +=
		"TOTAL".padEnd(12) +
		formatCurrency(totalEntradas).padStart(18) +
		formatCurrency(totalSaidas).padStart(18) +
		formatCurrency(totalEntradas - totalSaidas).padStart(18) +
		formatCurrency(
			dados.length > 0 ? (dados[dados?.length - 1]?.saldoAcumulado ?? 0) : 0,
		).padStart(18) +
		"\n";
	relatorio += "=".repeat(80) + "\n";

	return {
		content: relatorio,
		contentType: "text/plain; charset=utf-8",
		filename: `fluxo-caixa-${params.dataInicio}-${params.dataFim}.txt`,
	};
}

function gerarRelatorioHTML(
	dados: FluxoCaixaItem[],
	params: GerarRelatorioFluxoCaixaParams,
): { content: string; contentType: string; filename: string } {
	const formatCurrency = (value: number): string => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(value);
	};

	const formatDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("pt-BR");
	};

	let totalEntradas = 0;
	let totalSaidas = 0;

	const rows = dados
		.map((item) => {
			totalEntradas += item.entradas;
			totalSaidas += item.saidas;
			return `
      <tr>
        <td>${formatDate(item.data)}</td>
        <td style="text-align: right;">${formatCurrency(item.entradas)}</td>
        <td style="text-align: right;">${formatCurrency(item.saidas)}</td>
        <td style="text-align: right;">${formatCurrency(item.saldo)}</td>
        <td style="text-align: right;">${formatCurrency(item.saldoAcumulado)}</td>
      </tr>
    `;
		})
		.join("");

	const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Fluxo de Caixa</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    h1 {
      color: #2563eb;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
    }
    .info {
      margin: 20px 0;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #2563eb;
      color: white;
      padding: 12px;
      text-align: left;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    tr:hover {
      background-color: #f3f4f6;
    }
    .total-row {
      font-weight: bold;
      background-color: #e5e7eb;
    }
    .positive {
      color: #059669;
    }
    .negative {
      color: #dc2626;
    }
  </style>
</head>
<body>
  <h1>Relatório de Fluxo de Caixa</h1>
  <div class="info">
    <p><strong>Período:</strong> ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}</p>
    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th style="text-align: right;">Entradas</th>
        <th style="text-align: right;">Saídas</th>
        <th style="text-align: right;">Saldo</th>
        <th style="text-align: right;">Saldo Acumulado</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td><strong>TOTAL</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalEntradas)}</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalSaidas)}</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalEntradas - totalSaidas)}</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(dados.length > 0 ? (dados[dados?.length - 1]?.saldoAcumulado ?? 0) : 0)}</strong></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

	return {
		content: html,
		contentType: "text/html; charset=utf-8",
		filename: `fluxo-caixa-${params.dataInicio}-${params.dataFim}.html`,
	};
}

function gerarRelatorioPDF(
	dados: FluxoCaixaItem[],
	params: GerarRelatorioFluxoCaixaParams,
): { content: string; contentType: string; filename: string } {
	// Por enquanto, retornar HTML que pode ser convertido para PDF no frontend
	// Ou implementar com pdfkit/puppeteer se necessário
	// Por simplicidade, vamos retornar HTML que o navegador pode salvar como PDF
	const htmlResult = gerarRelatorioHTML(dados, params);
	return {
		content: htmlResult.content,
		contentType: "text/html; charset=utf-8",
		filename: `fluxo-caixa-${params.dataInicio}-${params.dataFim}.html`,
	};
}

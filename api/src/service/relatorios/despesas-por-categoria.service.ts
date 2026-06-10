import {
	buscarDespesasPorCategoria,
	type DespesasPorCategoriaItem,
} from "@/repositories/relatorios-repositories.js";

export interface GerarRelatorioDespesasPorCategoriaParams {
	idempresa: string;
	dataInicio: string; // YYYY-MM-DD
	dataFim: string; // YYYY-MM-DD
	formato: "pdf" | "txt" | "html";
}

export async function gerarRelatorioDespesasPorCategoria(
	params: GerarRelatorioDespesasPorCategoriaParams,
): Promise<{ content: string; contentType: string; filename: string }> {
	const dados = await buscarDespesasPorCategoria({
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

const formatCurrency = (value: number): string =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);

const formatDate = (dateStr: string): string =>
	new Date(dateStr).toLocaleDateString("pt-BR");

function gerarRelatorioTXT(
	dados: DespesasPorCategoriaItem[],
	params: GerarRelatorioDespesasPorCategoriaParams,
): { content: string; contentType: string; filename: string } {
	const totalGeral = dados.reduce((acc, item) => acc + item.total, 0);

	let relatorio = "=".repeat(90) + "\n";
	relatorio += "RELATORIO DE DESPESAS POR CATEGORIA\n";
	relatorio += "=".repeat(90) + "\n\n";
	relatorio += `Periodo: ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}\n`;
	relatorio += `Data de Emissao: ${new Date().toLocaleDateString("pt-BR")}\n\n`;
	relatorio += "-".repeat(90) + "\n";
	relatorio +=
		"Codigo".padEnd(12) + "Categoria".padEnd(52) + "Total".padStart(26) + "\n";
	relatorio += "-".repeat(90) + "\n";

	for (const item of dados) {
		relatorio +=
			String(item.codigo ?? "-")
				.slice(0, 10)
				.padEnd(12) +
			String(item.nome ?? "-")
				.slice(0, 50)
				.padEnd(52) +
			formatCurrency(item.total).padStart(26) +
			"\n";
	}

	relatorio += "-".repeat(90) + "\n";
	relatorio +=
		"TOTAL GERAL".padEnd(64) + formatCurrency(totalGeral).padStart(26) + "\n";
	relatorio += "=".repeat(90) + "\n";

	return {
		content: relatorio,
		contentType: "text/plain; charset=utf-8",
		filename: `despesas-por-categoria-${params.dataInicio}-${params.dataFim}.txt`,
	};
}

function gerarRelatorioHTML(
	dados: DespesasPorCategoriaItem[],
	params: GerarRelatorioDespesasPorCategoriaParams,
): { content: string; contentType: string; filename: string } {
	const totalGeral = dados.reduce((acc, item) => acc + item.total, 0);

	const rows = dados
		.map(
			(item) => `
      <tr>
        <td>${item.codigo ?? "-"}</td>
        <td>${item.nome ?? "-"}</td>
        <td style="text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
    `,
		)
		.join("");

	const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Despesas por Categoria</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px; }
    .info { margin: 20px 0; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #ea580c; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9fafb; }
    tr:hover { background-color: #f3f4f6; }
    .total-row { font-weight: bold; background-color: #e5e7eb; }
  </style>
</head>
<body>
  <h1>Relatório de Despesas por Categoria</h1>
  <div class="info">
    <p><strong>Período:</strong> ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}</p>
    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Categoria</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="2"><strong>TOTAL GERAL</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalGeral)}</strong></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

	return {
		content: html,
		contentType: "text/html; charset=utf-8",
		filename: `despesas-por-categoria-${params.dataInicio}-${params.dataFim}.html`,
	};
}

function gerarRelatorioPDF(
	dados: DespesasPorCategoriaItem[],
	params: GerarRelatorioDespesasPorCategoriaParams,
): { content: string; contentType: string; filename: string } {
	const htmlResult = gerarRelatorioHTML(dados, params);
	return {
		content: htmlResult.content,
		contentType: "text/html; charset=utf-8",
		filename: `despesas-por-categoria-${params.dataInicio}-${params.dataFim}.html`,
	};
}

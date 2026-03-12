import {
	buscarFormasDePagamento,
	type FormasDePagamentoItem,
} from "@/repositories/relatorios-repositories.js";

export interface GerarRelatorioFormasDePagamentoParams {
	idempresa: string;
	dataInicio: string; // YYYY-MM-DD
	dataFim: string; // YYYY-MM-DD
	formato: "pdf" | "txt" | "html";
}

export async function gerarRelatorioFormasDePagamento(
	params: GerarRelatorioFormasDePagamentoParams,
): Promise<{ content: string; contentType: string; filename: string }> {
	const dados = await buscarFormasDePagamento({
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
	dados: FormasDePagamentoItem[],
	params: GerarRelatorioFormasDePagamentoParams,
): { content: string; contentType: string; filename: string } {
	const totalReceitas = dados.reduce((acc, item) => acc + item.totalReceitas, 0);
	const totalDespesas = dados.reduce((acc, item) => acc + item.totalDespesas, 0);
	const totalSaldo = totalReceitas - totalDespesas;

	let relatorio = "=".repeat(110) + "\n";
	relatorio += "RELATORIO DE FORMAS DE PAGAMENTO\n";
	relatorio += "=".repeat(110) + "\n\n";
	relatorio += `Periodo (vencimento): ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}\n`;
	relatorio += `Data de Emissao: ${new Date().toLocaleDateString("pt-BR")}\n\n`;
	relatorio += "-".repeat(110) + "\n";
	relatorio +=
		"Forma de Pagamento".padEnd(35) +
		"Receitas".padStart(22) +
		"Despesas".padStart(22) +
		"Saldo".padStart(31) +
		"\n";
	relatorio += "-".repeat(110) + "\n";

	for (const item of dados) {
		relatorio +=
			String(item.formapagamento).slice(0, 33).padEnd(35) +
			formatCurrency(item.totalReceitas).padStart(22) +
			formatCurrency(item.totalDespesas).padStart(22) +
			formatCurrency(item.saldo).padStart(31) +
			"\n";
	}

	relatorio += "-".repeat(110) + "\n";
	relatorio +=
		"TOTAL GERAL".padEnd(35) +
		formatCurrency(totalReceitas).padStart(22) +
		formatCurrency(totalDespesas).padStart(22) +
		formatCurrency(totalSaldo).padStart(31) +
		"\n";
	relatorio += "=".repeat(110) + "\n";

	return {
		content: relatorio,
		contentType: "text/plain; charset=utf-8",
		filename: `formas-de-pagamento-${params.dataInicio}-${params.dataFim}.txt`,
	};
}

function gerarRelatorioHTML(
	dados: FormasDePagamentoItem[],
	params: GerarRelatorioFormasDePagamentoParams,
): { content: string; contentType: string; filename: string } {
	const totalReceitas = dados.reduce((acc, item) => acc + item.totalReceitas, 0);
	const totalDespesas = dados.reduce((acc, item) => acc + item.totalDespesas, 0);
	const totalSaldo = totalReceitas - totalDespesas;

	const rows = dados
		.map(
			(item) => `
      <tr>
        <td>${item.formapagamento}</td>
        <td style="text-align: right;">${formatCurrency(item.totalReceitas)}</td>
        <td style="text-align: right;">${formatCurrency(item.totalDespesas)}</td>
        <td style="text-align: right;">${formatCurrency(item.saldo)}</td>
      </tr>
    `,
		)
		.join("");

	const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Formas de Pagamento</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 10px; }
    .info { margin: 20px 0; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #0891b2; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9fafb; }
    tr:hover { background-color: #f3f4f6; }
    .total-row { font-weight: bold; background-color: #e5e7eb; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
  </style>
</head>
<body>
  <h1>Relatório de Formas de Pagamento</h1>
  <div class="info">
    <p><strong>Período (vencimento):</strong> ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}</p>
    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Forma de Pagamento</th>
        <th style="text-align: right;">Receitas</th>
        <th style="text-align: right;">Despesas</th>
        <th style="text-align: right;">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td><strong>TOTAL GERAL</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalReceitas)}</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalDespesas)}</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalSaldo)}</strong></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

	return {
		content: html,
		contentType: "text/html; charset=utf-8",
		filename: `formas-de-pagamento-${params.dataInicio}-${params.dataFim}.html`,
	};
}

function gerarRelatorioPDF(
	dados: FormasDePagamentoItem[],
	params: GerarRelatorioFormasDePagamentoParams,
): { content: string; contentType: string; filename: string } {
	const htmlResult = gerarRelatorioHTML(dados, params);
	return {
		content: htmlResult.content,
		contentType: "text/html; charset=utf-8",
		filename: `formas-de-pagamento-${params.dataInicio}-${params.dataFim}.html`,
	};
}

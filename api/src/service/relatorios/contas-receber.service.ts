import type { ContasReceberItem } from "@/repositories/relatorios-repositories.js";
import { buscarDadosContasReceber } from "@/repositories/relatorios-repositories.js";

export interface GerarRelatorioContasReceberParams {
	idempresa: string;
	dataInicio: string; // YYYY-MM-DD
	dataFim: string; // YYYY-MM-DD
	formato: "pdf" | "txt" | "html";
}

export async function gerarRelatorioContasReceber(
	params: GerarRelatorioContasReceberParams,
): Promise<{ content: string; contentType: string; filename: string }> {
	const dados = await buscarDadosContasReceber({
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

const formatDate = (dateStr: string | null): string =>
	dateStr ? new Date(dateStr).toLocaleDateString("pt-BR") : "-";

const formatStatus = (status: string | null): string => {
	if (status === "A") return "Aberto";
	if (status === "B") return "Baixado";
	return status ?? "-";
};

function gerarRelatorioTXT(
	dados: ContasReceberItem[],
	params: GerarRelatorioContasReceberParams,
): { content: string; contentType: string; filename: string } {
	let relatorio = "=".repeat(100) + "\n";
	relatorio += "RELATÓRIO DE CONTAS A RECEBER\n";
	relatorio += "=".repeat(100) + "\n\n";
	relatorio += `Período (vencimento): ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}\n`;
	relatorio += `Data de Emissão: ${new Date().toLocaleDateString("pt-BR")}\n\n`;
	relatorio += "-".repeat(100) + "\n";
	relatorio +=
		"Documento".padEnd(14) +
		"Emissão".padEnd(12) +
		"Vencimento".padEnd(12) +
		"Valor".padStart(14) +
		"Saldo".padStart(14) +
		"Status".padEnd(10) +
		"Emitente".padEnd(22) +
		"\n";
	relatorio += "-".repeat(100) + "\n";

	let totalValor = 0;
	let totalSaldo = 0;

	for (const item of dados) {
		totalValor += item.valor;
		totalSaldo += item.saldo;
		relatorio +=
			String(item.documento ?? "-")
				.slice(0, 12)
				.padEnd(14) +
			formatDate(item.emissao).padEnd(12) +
			formatDate(item.vencimento).padEnd(12) +
			formatCurrency(item.valor).padStart(14) +
			formatCurrency(item.saldo).padStart(14) +
			formatStatus(item.status).padEnd(10) +
			String(item.emitente ?? "-")
				.slice(0, 20)
				.padEnd(22) +
			"\n";
	}

	relatorio += "-".repeat(100) + "\n";
	relatorio +=
		"TOTAL".padEnd(50) +
		formatCurrency(totalValor).padStart(14) +
		formatCurrency(totalSaldo).padStart(14) +
		"\n";
	relatorio += "=".repeat(100) + "\n";

	return {
		content: relatorio,
		contentType: "text/plain; charset=utf-8",
		filename: `contas-a-receber-${params.dataInicio}-${params.dataFim}.txt`,
	};
}

function gerarRelatorioHTML(
	dados: ContasReceberItem[],
	params: GerarRelatorioContasReceberParams,
): { content: string; contentType: string; filename: string } {
	let totalValor = 0;
	let totalSaldo = 0;

	const rows = dados
		.map((item) => {
			totalValor += item.valor;
			totalSaldo += item.saldo;
			return `
      <tr>
        <td>${item.documento ?? "-"}</td>
        <td>${formatDate(item.emissao)}</td>
        <td>${formatDate(item.vencimento)}</td>
        <td style="text-align: right;">${formatCurrency(item.valor)}</td>
        <td style="text-align: right;">${formatCurrency(item.saldo)}</td>
        <td>${formatStatus(item.status)}</td>
        <td>${item.emitente ?? "-"}</td>
      </tr>
    `;
		})
		.join("");

	const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Contas a Receber</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; }
    .info { margin: 20px 0; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #059669; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9fafb; }
    tr:hover { background-color: #f3f4f6; }
    .total-row { font-weight: bold; background-color: #e5e7eb; }
  </style>
</head>
<body>
  <h1>Relatório de Contas a Receber</h1>
  <div class="info">
    <p><strong>Período (vencimento):</strong> ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}</p>
    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Documento</th>
        <th>Emissão</th>
        <th>Vencimento</th>
        <th style="text-align: right;">Valor</th>
        <th style="text-align: right;">Saldo</th>
        <th>Status</th>
        <th>Emitente</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3"><strong>TOTAL</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalValor)}</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalSaldo)}</strong></td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

	return {
		content: html,
		contentType: "text/html; charset=utf-8",
		filename: `contas-a-receber-${params.dataInicio}-${params.dataFim}.html`,
	};
}

function gerarRelatorioPDF(
	dados: ContasReceberItem[],
	params: GerarRelatorioContasReceberParams,
): { content: string; contentType: string; filename: string } {
	const htmlResult = gerarRelatorioHTML(dados, params);
	return {
		content: htmlResult.content,
		contentType: "text/html; charset=utf-8",
		filename: `contas-a-receber-${params.dataInicio}-${params.dataFim}.html`,
	};
}

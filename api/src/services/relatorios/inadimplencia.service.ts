import {
	buscarDadosInadimplencia,
	type InadimplenciaItem,
} from "@/repositories/relatorios-repositories.js";

export interface GerarRelatorioInadimplenciaParams {
	idempresa: string;
	dataInicio: string; // YYYY-MM-DD
	dataFim: string; // YYYY-MM-DD
	formato: "pdf" | "txt" | "html";
}

export async function gerarRelatorioInadimplencia(
	params: GerarRelatorioInadimplenciaParams,
): Promise<{ content: string; contentType: string; filename: string }> {
	const dados = await buscarDadosInadimplencia({
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
	dados: InadimplenciaItem[],
	params: GerarRelatorioInadimplenciaParams,
): { content: string; contentType: string; filename: string } {
	const totalValor = dados.reduce((acc, item) => acc + item.valor, 0);
	const totalSaldo = dados.reduce((acc, item) => acc + item.saldo, 0);

	let relatorio = "=".repeat(135) + "\n";
	relatorio += "RELATORIO DE INADIMPLENCIA\n";
	relatorio += "=".repeat(135) + "\n\n";
	relatorio += `Periodo (vencimento): ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}\n`;
	relatorio += `Data de Emissao: ${new Date().toLocaleDateString("pt-BR")}\n\n`;
	relatorio += "-".repeat(135) + "\n";
	relatorio +=
		"Documento".padEnd(18) +
		"Emitente".padEnd(36) +
		"Vencimento".padEnd(14) +
		"Valor".padStart(18) +
		"Saldo".padStart(18) +
		"Dias Atraso".padStart(31) +
		"\n";
	relatorio += "-".repeat(135) + "\n";

	for (const item of dados) {
		relatorio +=
			String(item.documento ?? "-")
				.slice(0, 16)
				.padEnd(18) +
			String(item.emitente ?? "-")
				.slice(0, 34)
				.padEnd(36) +
			String(item.vencimento ? formatDate(item.vencimento) : "-").padEnd(14) +
			formatCurrency(item.valor).padStart(18) +
			formatCurrency(item.saldo).padStart(18) +
			String(item.diasAtraso).padStart(31) +
			"\n";
	}

	relatorio += "-".repeat(135) + "\n";
	relatorio +=
		"TOTAL GERAL".padEnd(68) +
		formatCurrency(totalValor).padStart(18) +
		formatCurrency(totalSaldo).padStart(18) +
		"".padStart(31) +
		"\n";
	relatorio += "=".repeat(135) + "\n";

	return {
		content: relatorio,
		contentType: "text/plain; charset=utf-8",
		filename: `inadimplencia-${params.dataInicio}-${params.dataFim}.txt`,
	};
}

function gerarRelatorioHTML(
	dados: InadimplenciaItem[],
	params: GerarRelatorioInadimplenciaParams,
): { content: string; contentType: string; filename: string } {
	const totalValor = dados.reduce((acc, item) => acc + item.valor, 0);
	const totalSaldo = dados.reduce((acc, item) => acc + item.saldo, 0);

	const rows = dados
		.map(
			(item) => `
      <tr>
        <td>${item.documento ?? "-"}</td>
        <td>${item.emitente ?? "-"}</td>
        <td>${item.vencimento ? formatDate(item.vencimento) : "-"}</td>
        <td style="text-align: right;">${formatCurrency(item.valor)}</td>
        <td style="text-align: right;">${formatCurrency(item.saldo)}</td>
        <td style="text-align: right;">${item.diasAtraso}</td>
      </tr>
    `,
		)
		.join("");

	const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Inadimplência</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #e11d48; border-bottom: 2px solid #e11d48; padding-bottom: 10px; }
    .info { margin: 20px 0; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #e11d48; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9fafb; }
    tr:hover { background-color: #f3f4f6; }
    .total-row { font-weight: bold; background-color: #e5e7eb; }
  </style>
</head>
<body>
  <h1>Relatório de Inadimplência</h1>
  <div class="info">
    <p><strong>Período (vencimento):</strong> ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}</p>
    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Documento</th>
        <th>Emitente</th>
        <th>Vencimento</th>
        <th style="text-align: right;">Valor</th>
        <th style="text-align: right;">Saldo</th>
        <th style="text-align: right;">Dias em Atraso</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3"><strong>TOTAL GERAL</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalValor)}</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(totalSaldo)}</strong></td>
        <td></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

	return {
		content: html,
		contentType: "text/html; charset=utf-8",
		filename: `inadimplencia-${params.dataInicio}-${params.dataFim}.html`,
	};
}

function gerarRelatorioPDF(
	dados: InadimplenciaItem[],
	params: GerarRelatorioInadimplenciaParams,
): { content: string; contentType: string; filename: string } {
	const htmlResult = gerarRelatorioHTML(dados, params);
	return {
		content: htmlResult.content,
		contentType: "text/html; charset=utf-8",
		filename: `inadimplencia-${params.dataInicio}-${params.dataFim}.html`,
	};
}

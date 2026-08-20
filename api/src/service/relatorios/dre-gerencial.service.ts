import {
	buscarDadosDreGerencial,
	type DreGerencialDados,
} from "@/repositories/relatorios-repositories.js";

export interface GerarRelatorioDreGerencialParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	formato: "pdf" | "txt" | "html";
}

export async function gerarRelatorioDreGerencial(
	params: GerarRelatorioDreGerencialParams,
): Promise<{ content: string; contentType: string; filename: string }> {
	const dados = await buscarDadosDreGerencial({
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
	dados: DreGerencialDados,
	params: GerarRelatorioDreGerencialParams,
): { content: string; contentType: string; filename: string } {
	let relatorio = "=".repeat(90) + "\n";
	relatorio += "DRE GERENCIAL\n";
	relatorio += "=".repeat(90) + "\n\n";
	relatorio += `Periodo: ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}\n`;
	relatorio += `Data de Emissao: ${new Date().toLocaleDateString("pt-BR")}\n\n`;

	relatorio += "-".repeat(90) + "\n";
	relatorio += "RECEITA TOTAL".padEnd(64) + formatCurrency(dados.totalReceitas).padStart(26) + "\n";
	relatorio += "-".repeat(90) + "\n";
	for (const item of dados.receitas) {
		const label = `${item.codigo ? `${item.codigo} - ` : ""}${item.nome ?? "-"}`;
		relatorio +=
			`  ${label}`.slice(0, 64).padEnd(64) +
			formatCurrency(item.total).padStart(26) +
			"\n";
	}

	relatorio += "\n";
	relatorio += "-".repeat(90) + "\n";
	relatorio += "DESPESA TOTAL".padEnd(64) + formatCurrency(dados.totalDespesas).padStart(26) + "\n";
	relatorio += "-".repeat(90) + "\n";
	for (const item of dados.despesas) {
		const label = `${item.codigo ? `${item.codigo} - ` : ""}${item.nome ?? "-"}`;
		relatorio +=
			`  ${label}`.slice(0, 64).padEnd(64) +
			formatCurrency(item.total).padStart(26) +
			"\n";
	}

	relatorio += "\n";
	relatorio += "=".repeat(90) + "\n";
	relatorio +=
		"LUCRO OU PREJUIZO LIQUIDO".padEnd(64) +
		formatCurrency(dados.resultado).padStart(26) +
		"\n";
	relatorio += "=".repeat(90) + "\n";

	return {
		content: relatorio,
		contentType: "text/plain; charset=utf-8",
		filename: `dre-gerencial-${params.dataInicio}-${params.dataFim}.txt`,
	};
}

function gerarRelatorioHTML(
	dados: DreGerencialDados,
	params: GerarRelatorioDreGerencialParams,
): { content: string; contentType: string; filename: string } {
	const receitaRows = dados.receitas
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

	const despesaRows = dados.despesas
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
  <title>DRE Gerencial</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
    h2 { color: #4b5563; margin-top: 28px; font-size: 1.1rem; }
    .info { margin: 20px 0; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; }
    th { background-color: #7c3aed; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9fafb; }
    .total-row { font-weight: bold; background-color: #e5e7eb; }
    .resultado-row { font-weight: bold; background-color: #ede9fe; }
  </style>
</head>
<body>
  <h1>DRE Gerencial</h1>
  <div class="info">
    <p><strong>Período:</strong> ${formatDate(params.dataInicio)} a ${formatDate(params.dataFim)}</p>
    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>

  <h2>Receitas</h2>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Conta</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${receitaRows || `<tr><td colspan="3">Nenhuma receita no período</td></tr>`}
      <tr class="total-row">
        <td colspan="2"><strong>RECEITA TOTAL</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(dados.totalReceitas)}</strong></td>
      </tr>
    </tbody>
  </table>

  <h2>Despesas</h2>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Conta</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${despesaRows || `<tr><td colspan="3">Nenhuma despesa no período</td></tr>`}
      <tr class="total-row">
        <td colspan="2"><strong>DESPESA TOTAL</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(dados.totalDespesas)}</strong></td>
      </tr>
    </tbody>
  </table>

  <table>
    <tbody>
      <tr class="resultado-row">
        <td colspan="2"><strong>LUCRO OU PREJUÍZO LÍQUIDO</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(dados.resultado)}</strong></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

	return {
		content: html,
		contentType: "text/html; charset=utf-8",
		filename: `dre-gerencial-${params.dataInicio}-${params.dataFim}.html`,
	};
}

function gerarRelatorioPDF(
	dados: DreGerencialDados,
	params: GerarRelatorioDreGerencialParams,
): { content: string; contentType: string; filename: string } {
	const htmlResult = gerarRelatorioHTML(dados, params);
	return {
		content: htmlResult.content,
		contentType: "text/html; charset=utf-8",
		filename: `dre-gerencial-${params.dataInicio}-${params.dataFim}.html`,
	};
}

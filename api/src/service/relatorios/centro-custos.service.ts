import {
	buscarDadosCentroCustos,
	type CentroCustosItem,
} from "@/repositories/relatorios-repositories.js";

export interface GerarRelatorioCentroCustosParams {
	idempresa: string;
	formato: "pdf" | "txt" | "html";
}

export async function gerarRelatorioCentroCustos(
	params: GerarRelatorioCentroCustosParams,
): Promise<{ content: string; contentType: string; filename: string }> {
	const dados = await buscarDadosCentroCustos({
		idempresa: params.idempresa,
	});

	switch (params.formato) {
		case "txt":
			return gerarRelatorioTXT(dados);
		case "html":
			return gerarRelatorioHTML(dados);
		case "pdf":
			return gerarRelatorioPDF(dados);
		default:
			throw new Error(`Formato não suportado: ${params.formato}`);
	}
}

const formatCurrency = (value: number): string =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);

function gerarRelatorioTXT(dados: CentroCustosItem[]): {
	content: string;
	contentType: string;
	filename: string;
} {
	const totalReceitas = dados.reduce(
		(acc, item) => acc + item.totalReceitas,
		0,
	);
	const totalDespesas = dados.reduce(
		(acc, item) => acc + item.totalDespesas,
		0,
	);
	const totalSaldo = totalReceitas - totalDespesas;

	let relatorio = "=".repeat(120) + "\n";
	relatorio += "RELATORIO DE CENTRO DE CUSTOS\n";
	relatorio += "=".repeat(120) + "\n\n";
	relatorio += `Data de Emissao: ${new Date().toLocaleDateString("pt-BR")}\n`;
	relatorio +=
		"Observação: relatório estrutural (sem rateio financeiro por centro de custo).\n\n";
	relatorio += "-".repeat(120) + "\n";
	relatorio +=
		"Codigo".padEnd(18) +
		"Centro de Custo".padEnd(50) +
		"Receitas".padStart(17) +
		"Despesas".padStart(17) +
		"Saldo".padStart(18) +
		"\n";
	relatorio += "-".repeat(120) + "\n";

	for (const item of dados) {
		relatorio +=
			String(item.codigo ?? "-")
				.slice(0, 16)
				.padEnd(18) +
			String(item.nome ?? "-")
				.slice(0, 48)
				.padEnd(50) +
			formatCurrency(item.totalReceitas).padStart(17) +
			formatCurrency(item.totalDespesas).padStart(17) +
			formatCurrency(item.saldo).padStart(18) +
			"\n";
	}

	relatorio += "-".repeat(120) + "\n";
	relatorio +=
		"TOTAL GERAL".padEnd(68) +
		formatCurrency(totalReceitas).padStart(17) +
		formatCurrency(totalDespesas).padStart(17) +
		formatCurrency(totalSaldo).padStart(18) +
		"\n";
	relatorio += "=".repeat(120) + "\n";

	return {
		content: relatorio,
		contentType: "text/plain; charset=utf-8",
		filename: `centro-custos-${new Date().toISOString().split("T")[0]}.txt`,
	};
}

function gerarRelatorioHTML(dados: CentroCustosItem[]): {
	content: string;
	contentType: string;
	filename: string;
} {
	const totalReceitas = dados.reduce(
		(acc, item) => acc + item.totalReceitas,
		0,
	);
	const totalDespesas = dados.reduce(
		(acc, item) => acc + item.totalDespesas,
		0,
	);
	const totalSaldo = totalReceitas - totalDespesas;

	const rows = dados
		.map(
			(item) => `
      <tr>
        <td>${item.codigo ?? "-"}</td>
        <td>${item.nome ?? "-"}</td>
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
  <title>Relatório de Centro de Custos</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #4338ca; border-bottom: 2px solid #4338ca; padding-bottom: 10px; }
    .info { margin: 20px 0; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #4338ca; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9fafb; }
    tr:hover { background-color: #f3f4f6; }
    .total-row { font-weight: bold; background-color: #e5e7eb; }
  </style>
</head>
<body>
  <h1>Relatório de Centro de Custos</h1>
  <div class="info">
    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
    <p><strong>Observação:</strong> relatório estrutural (sem rateio financeiro por centro de custo).</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Centro de Custo</th>
        <th style="text-align: right;">Receitas</th>
        <th style="text-align: right;">Despesas</th>
        <th style="text-align: right;">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="2"><strong>TOTAL GERAL</strong></td>
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
		filename: `centro-custos-${new Date().toISOString().split("T")[0]}.html`,
	};
}

function gerarRelatorioPDF(dados: CentroCustosItem[]): {
	content: string;
	contentType: string;
	filename: string;
} {
	const htmlResult = gerarRelatorioHTML(dados);
	return {
		content: htmlResult.content,
		contentType: "text/html; charset=utf-8",
		filename: `centro-custos-${new Date().toISOString().split("T")[0]}.html`,
	};
}

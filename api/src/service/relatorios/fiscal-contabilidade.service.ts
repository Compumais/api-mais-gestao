import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	listarNotasRelatorioFiscalContabilidade,
	type RelatorioFiscalNotaItem,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	calcularTotaisFiscais,
	classificarDocumentoFiscal,
	formatCurrency,
	formatDate,
	gerarRelatorioFiscal,
	obterNumeroDocumento,
	parseDecimal,
	type FormatoRelatorioFiscal,
	type RelatorioFiscalOutput,
} from "@/service/relatorios/relatorio-fiscal-format.js";

export interface GerarRelatorioFiscalContabilidadeParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	formato: FormatoRelatorioFiscal;
}

const COLUNAS = [
	{ label: "Tipo", width: 55 },
	{ label: "Emissão", width: 50 },
	{ label: "Número", width: 45 },
	{ label: "Parceiro", width: 100 },
	{ label: "CFOP", width: 35 },
	{ label: "Valor", width: 60, align: "right" as const },
	{ label: "ICMS", width: 50, align: "right" as const },
	{ label: "Chave", width: 120 },
];

function calcularResumoContabilidade(notas: RelatorioFiscalNotaItem[]) {
	const compras = notas.filter((n) => n.tipoorigem === 0);
	const vendasNfe = notas.filter((n) => n.modelo === "55" && n.tipoorigem === 1);
	const nfce = notas.filter((n) => n.modelo === "65");
	const totalCompras = calcularTotaisFiscais(compras);
	const totalVendasNfe = calcularTotaisFiscais(vendasNfe);
	const totalNfce = calcularTotaisFiscais(nfce);
	const totalGeral = calcularTotaisFiscais(notas);

	return [
		`NF-e Compra: ${compras.length} — ${formatCurrency(totalCompras.valor)}`,
		`NF-e Venda: ${vendasNfe.length} — ${formatCurrency(totalVendasNfe.valor)}`,
		`NFC-e: ${nfce.length} — ${formatCurrency(totalNfce.valor)}`,
		`Total: ${notas.length} documento(s) — ${formatCurrency(totalGeral.valor)} | ICMS: ${formatCurrency(totalGeral.icms)}`,
	];
}

export async function gerarRelatorioFiscalContabilidade(
	params: GerarRelatorioFiscalContabilidadeParams,
): Promise<RelatorioFiscalOutput> {
	const [empresa, notas] = await Promise.all([
		buscarEmpresaPorId(params.idempresa),
		listarNotasRelatorioFiscalContabilidade(params),
	]);

	if (!empresa) {
		throw new Error("Empresa não encontrada");
	}

	return gerarRelatorioFiscal({
		...params,
		titulo: "Relatório Fiscal Consolidado — Contabilidade",
		prefixoArquivo: "fiscal-contabilidade",
		empresaNome: empresa.nome,
		empresaCnpj: empresa.cnpj,
		notas,
		colunas: COLUNAS,
		resumoLinhas: calcularResumoContabilidade(notas),
		montarLinha: (nota: RelatorioFiscalNotaItem) => [
			classificarDocumentoFiscal(nota),
			formatDate(nota.emissao),
			obterNumeroDocumento(nota),
			nota.parceiroNome ?? "-",
			nota.cfopCodigo ?? "-",
			formatCurrency(parseDecimal(nota.valortotalnota)),
			formatCurrency(parseDecimal(nota.icms)),
			nota.chavenfe ?? "-",
		],
	});
}

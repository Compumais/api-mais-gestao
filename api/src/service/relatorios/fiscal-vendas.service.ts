import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	listarNotasRelatorioFiscalVendas,
	type RelatorioFiscalNotaItem,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	calcularTotaisFiscais,
	formatCurrency,
	formatDate,
	gerarRelatorioFiscal,
	obterNumeroDocumento,
	parseDecimal,
	type FormatoRelatorioFiscal,
	type RelatorioFiscalOutput,
} from "@/service/relatorios/relatorio-fiscal-format.js";

export interface GerarRelatorioFiscalVendasParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	formato: FormatoRelatorioFiscal;
}

const COLUNAS = [
	{ label: "Emissão", width: 55 },
	{ label: "Número", width: 50 },
	{ label: "Modelo", width: 40 },
	{ label: "Cliente", width: 110 },
	{ label: "CFOP", width: 40 },
	{ label: "Valor", width: 65, align: "right" as const },
	{ label: "ICMS", width: 55, align: "right" as const },
];

function calcularResumoVendas(notas: RelatorioFiscalNotaItem[]) {
	const nfe = notas.filter((n) => n.modelo === "55");
	const nfce = notas.filter((n) => n.modelo === "65");
	const totalNfe = calcularTotaisFiscais(nfe);
	const totalNfce = calcularTotaisFiscais(nfce);
	const totalGeral = calcularTotaisFiscais(notas);

	return [
		`NF-e (55): ${nfe.length} documento(s) — ${formatCurrency(totalNfe.valor)}`,
		`NFC-e (65): ${nfce.length} documento(s) — ${formatCurrency(totalNfce.valor)}`,
		`Total geral: ${notas.length} documento(s) — ${formatCurrency(totalGeral.valor)}`,
	];
}

export async function gerarRelatorioFiscalVendas(
	params: GerarRelatorioFiscalVendasParams,
): Promise<RelatorioFiscalOutput> {
	const [empresa, notas] = await Promise.all([
		buscarEmpresaPorId(params.idempresa),
		listarNotasRelatorioFiscalVendas(params),
	]);

	if (!empresa) {
		throw new Error("Empresa não encontrada");
	}

	return gerarRelatorioFiscal({
		...params,
		titulo: "Relatório Fiscal de Vendas",
		prefixoArquivo: "fiscal-vendas",
		empresaNome: empresa.nome,
		empresaCnpj: empresa.cnpj,
		notas,
		colunas: COLUNAS,
		resumoLinhas: calcularResumoVendas(notas),
		montarLinha: (nota: RelatorioFiscalNotaItem) => [
			formatDate(nota.emissao),
			obterNumeroDocumento(nota),
			nota.modelo ?? "-",
			nota.parceiroNome ?? "-",
			nota.cfopCodigo ?? "-",
			formatCurrency(parseDecimal(nota.valortotalnota)),
			formatCurrency(parseDecimal(nota.icms)),
		],
	});
}

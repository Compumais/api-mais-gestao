import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	listarNotasRelatorioFiscalCompras,
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

export interface GerarRelatorioFiscalComprasParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	formato: FormatoRelatorioFiscal;
}

const COLUNAS = [
	{ label: "Emissão", width: 55 },
	{ label: "Número", width: 50 },
	{ label: "Fornecedor", width: 120 },
	{ label: "CFOP", width: 40 },
	{ label: "Valor", width: 65, align: "right" as const },
	{ label: "Base ICMS", width: 65, align: "right" as const },
	{ label: "ICMS", width: 55, align: "right" as const },
];

export async function gerarRelatorioFiscalCompras(
	params: GerarRelatorioFiscalComprasParams,
): Promise<RelatorioFiscalOutput> {
	const [empresa, notas] = await Promise.all([
		buscarEmpresaPorId(params.idempresa),
		listarNotasRelatorioFiscalCompras(params),
	]);

	if (!empresa) {
		throw new Error("Empresa não encontrada");
	}

	const totais = calcularTotaisFiscais(notas);

	return gerarRelatorioFiscal({
		...params,
		titulo: "Relatório Fiscal de Compras",
		prefixoArquivo: "fiscal-compras",
		empresaNome: empresa.nome,
		empresaCnpj: empresa.cnpj,
		notas,
		colunas: COLUNAS,
		resumoLinhas: [
			`Documentos: ${notas.length}`,
			`Valor total: ${formatCurrency(totais.valor)}`,
			`ICMS total: ${formatCurrency(totais.icms)}`,
		],
		montarLinha: (nota: RelatorioFiscalNotaItem) => [
			formatDate(nota.emissao),
			obterNumeroDocumento(nota),
			nota.parceiroNome ?? "-",
			nota.cfopCodigo ?? "-",
			formatCurrency(parseDecimal(nota.valortotalnota)),
			formatCurrency(parseDecimal(nota.baseicms)),
			formatCurrency(parseDecimal(nota.icms)),
		],
	});
}

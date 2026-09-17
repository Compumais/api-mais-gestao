"use client";

import { FiscalReportPage } from "@/components/fiscal-report-page";
import { gerarRelatorioFiscalVendas } from "@/services/relatorios.service";
import { PageContainer } from "../../../components/page-container";

export default function RelatorioFiscalVendasPage() {
	return (
		<PageContainer>
			<FiscalReportPage
				titulo="Relatório de vendas"
				descricao="Listagem analítica das NF-e de saída e NFC-e autorizadas no período, com os produtos de cada documento."
				gerarRelatorio={gerarRelatorioFiscalVendas}
			/>
		</PageContainer>
	);
}

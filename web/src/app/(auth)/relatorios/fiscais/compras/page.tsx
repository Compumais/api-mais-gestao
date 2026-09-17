"use client";

import { FiscalReportPage } from "@/components/fiscal-report-page";
import { gerarRelatorioFiscalCompras } from "@/services/relatorios.service";
import { PageContainer } from "../../../components/page-container";

export default function RelatorioFiscalComprasPage() {
	return (
		<PageContainer>
			<FiscalReportPage
				titulo="Relatório de compras"
				descricao="Listagem analítica das notas fiscais de entrada confirmadas no período, com os produtos de cada documento."
				gerarRelatorio={gerarRelatorioFiscalCompras}
			/>
		</PageContainer>
	);
}

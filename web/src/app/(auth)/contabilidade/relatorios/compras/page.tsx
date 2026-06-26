"use client";

import { FiscalReportPage } from "@/components/fiscal-report-page";
import { gerarRelatorioFiscalCompras } from "@/services/relatorios.service";
import { PageContainer } from "../../../components/page-container";

export default function RelatorioComprasContabilidadePage() {
	return (
		<PageContainer>
			<FiscalReportPage
				titulo="Relatório de compras"
				descricao="Listagem analítica das notas fiscais de entrada confirmadas no período, com fornecedor, CFOP e impostos."
				gerarRelatorio={gerarRelatorioFiscalCompras}
			/>
		</PageContainer>
	);
}

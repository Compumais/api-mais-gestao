"use client";

import { FiscalReportPage } from "@/components/fiscal-report-page";
import { gerarRelatorioFiscalContabilidade } from "@/services/relatorios.service";
import { PageContainer } from "../../components/page-container";

export default function RelatoriosContabilidadePage() {
	return (
		<PageContainer>
			<FiscalReportPage
				titulo="Relatórios fiscais — Contabilidade"
				descricao="Relatório consolidado com NF-e de compra, NF-e de venda e NFC-e autorizadas no período, com totais por tipo de documento."
				cardDescricao="Documentos confirmados ou autorizados com data de emissão no intervalo informado."
				gerarRelatorio={gerarRelatorioFiscalContabilidade}
			/>
		</PageContainer>
	);
}

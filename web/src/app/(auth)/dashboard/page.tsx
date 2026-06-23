"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageContainer } from "../components/page-container";
import { ComparativoSection } from "./components/comparativo-section";
import { ControleSection } from "./components/controle-section";
import { DreSection } from "./components/dre-section";
import { FinanceiroSection } from "./components/financeiro-section";
import { VendasSection } from "./components/vendas-section";

type DashboardTab =
	| "vendas"
	| "financeiro"
	| "controle"
	| "dre"
	| "comparativo";

export default function Page() {
	const [activeTab, setActiveTab] = React.useState<DashboardTab>("financeiro");

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4 lg:px-6">
					<ToggleGroup
						type="single"
						value={activeTab}
						onValueChange={(value) => {
							if (value) setActiveTab(value as DashboardTab);
						}}
						variant="outline"
						className="flex flex-wrap justify-start gap-1"
					>
						<ToggleGroupItem value="vendas">Vendas</ToggleGroupItem>
						<ToggleGroupItem value="financeiro">Financeiro</ToggleGroupItem>
						<ToggleGroupItem value="controle">Controle</ToggleGroupItem>
						<ToggleGroupItem value="dre">DRE</ToggleGroupItem>
						<ToggleGroupItem value="comparativo">Comparativo</ToggleGroupItem>
					</ToggleGroup>
				</div>

				{activeTab === "vendas" && <VendasSection />}
				{activeTab === "financeiro" && <FinanceiroSection />}
				{activeTab === "controle" && <ControleSection />}
				{activeTab === "dre" && <DreSection />}
				{activeTab === "comparativo" && <ComparativoSection />}
			</div>
		</PageContainer>
	);
}

"use client";

import { PageContainer } from "@/app/(auth)/components/page-container";
import { BudgetCentroCustoForm } from "../components/budget-centro-custo-form";

export default function NovoOrcamentoCentroCustoPage() {
	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6 px-4">
				<h1 className="text-2xl font-bold">Novo orçamento de centro de custo</h1>
				<BudgetCentroCustoForm />
			</div>
		</PageContainer>
	);
}

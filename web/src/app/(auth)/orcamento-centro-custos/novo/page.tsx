"use client";

import { PageContainer } from "@/app/(auth)/components/page-container";
import { BudgetCentroCustoForm } from "../components/budget-centro-custo-form";

export default function NovoOrcamentoCentroCustoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo orçamento de centro de custo</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<BudgetCentroCustoForm />
			</div>
		</PageContainer>
	);
}

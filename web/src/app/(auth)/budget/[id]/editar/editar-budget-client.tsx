"use client";

import { useQuery } from "@tanstack/react-query";
import { budgetsService } from "@/services/budgets.service";
import { BudgetForm } from "../../components/budget-form";

type EditarBudgetClientProps = {
	id: string;
};

export function EditarBudgetClient({ id }: EditarBudgetClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["budget", id],
		queryFn: async () => {
			return await budgetsService.buscar(id);
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!data) {
		return (
			<div className="flex items-center justify-center py-8">
				<p className="text-muted-foreground">Budget não encontrado.</p>
			</div>
		);
	}

	return (
		<BudgetForm
			modo="editar"
			budgetId={id}
			valoresIniciais={{
				idplanocontas: data.idplanocontas,
				ano: data.ano,
				periodicidade: data.periodicidade === "A" ? "A" : "M",
				mes: data.mes,
				valor: Number(data.valor),
			}}
		/>
	);
}

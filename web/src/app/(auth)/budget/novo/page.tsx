import { PageContainer } from "@/app/(auth)/components/page-container";
import { BudgetForm } from "../components/budget-form";

export default function NovoBudgetPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo Budget</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<BudgetForm modo="criar" />
			</div>
		</PageContainer>
	);
}

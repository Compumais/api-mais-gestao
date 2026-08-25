import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarBudgetClient } from "./editar-budget-client";

type EditarBudgetPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarBudgetPage({
	params,
}: EditarBudgetPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Budget</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarBudgetClient id={id} />
			</div>
		</PageContainer>
	);
}

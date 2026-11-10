import { PageContainer } from "@/app/(auth)/components/page-container";
import { LocalEstoqueForm } from "../components/local-estoque-form";

export default function NovoLocalEstoquePage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo Local de Estoque</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<LocalEstoqueForm modo="criar" />
			</div>
		</PageContainer>
	);
}

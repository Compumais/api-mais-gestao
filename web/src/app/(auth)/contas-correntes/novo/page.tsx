import { PageContainer } from "@/app/(auth)/components/page-container";
import { ContaCorrenteForm } from "../components/conta-corrente-form";

export default function NovaContaCorrentePage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Nova Conta Corrente</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<ContaCorrenteForm modo="criar" />
			</div>
		</PageContainer>
	);
}

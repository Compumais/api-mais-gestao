import { PageContainer } from "@/app/(auth)/components/page-container";
import { TipoProblemaForm } from "../components/tipo-problema-form";

export default function NovoTipoProblemaPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo tipo de problema</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<TipoProblemaForm modo="criar" />
			</div>
		</PageContainer>
	);
}

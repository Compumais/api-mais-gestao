import { PlanoContasTree } from "@/app/(auth)/plano-contas/componentes/plano-contas-tree";
import { PageContainer } from "../components/page-container";

export default function PlanoContasPage() {
	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between p-4">
					<h1 className="text-2xl font-bold">Plano de contas</h1>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<PlanoContasTree />
				</div>
			</div>
		</PageContainer>
	);
}

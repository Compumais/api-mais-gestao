import { PageContainer } from "@/app/(auth)/components/page-container";
import { GrupoContratoForm } from "../components/grupo-contrato-form";

export default function NovoGrupoContratoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo grupo de contrato</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				<GrupoContratoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

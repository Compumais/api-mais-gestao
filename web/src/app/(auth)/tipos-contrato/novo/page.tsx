import { PageContainer } from "@/app/(auth)/components/page-container";
import { TipoContratoForm } from "../components/tipo-contrato-form";

export default function NovoTipoContratoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo tipo de contrato</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				<TipoContratoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

import { PageContainer } from "@/app/(auth)/components/page-container";
import { UnidadeMedidaForm } from "../components/unidade-medida-form";

export default function NovaUnidadeMedidaPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Nova Unidade de Medida</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<UnidadeMedidaForm modo="criar" />
			</div>
		</PageContainer>
	);
}

import { PageContainer } from "@/app/(auth)/components/page-container";
import { ContratoForm } from "../components/contrato-form";

export default function NovoContratoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo contrato</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				<ContratoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

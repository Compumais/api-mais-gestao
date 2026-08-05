import { PageContainer } from "@/app/(auth)/components/page-container";
import { ServicoForm } from "../components/servico-form";

export default function NovoServicoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo Serviço</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<ServicoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

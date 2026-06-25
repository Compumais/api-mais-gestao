import { PageContainer } from "@/app/(auth)/components/page-container";
import { MeioPagamentoForm } from "../components/meio-pagamento-form";

export default function NovoMeioPagamentoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo meio de pagamento</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<MeioPagamentoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

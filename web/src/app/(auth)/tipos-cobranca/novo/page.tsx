import { PageContainer } from "@/app/(auth)/components/page-container";
import { TipoCobrancaForm } from "../components/tipo-cobranca-form";

export default function NovoTipoCobrancaPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo tipo de cobrança</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<TipoCobrancaForm modo="criar" />
			</div>
		</PageContainer>
	);
}

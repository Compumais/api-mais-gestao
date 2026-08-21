import { PageContainer } from "@/app/(auth)/components/page-container";
import { FichaProducaoForm } from "../components/ficha-producao-form";

export default function NovaFichaProducaoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Nova ficha de produção</h1>
			</div>
			<div className="mx-4 mb-4 rounded-lg border bg-card p-4">
				<FichaProducaoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

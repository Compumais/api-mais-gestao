import { PageContainer } from "@/app/(auth)/components/page-container";
import { FatorConversaoForm } from "../components/fator-conversao-form";

export default function NovoFatorConversaoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo Fator de Conversão</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<FatorConversaoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

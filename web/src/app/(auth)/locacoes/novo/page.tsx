import { PageContainer } from "@/app/(auth)/components/page-container";
import { LocacaoForm } from "../components/locacao-form";

export default function NovaLocacaoPage() {
	return (
		<PageContainer>
			<div className="p-4">
				<h1 className="text-2xl font-bold">Nova locação</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				<LocacaoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

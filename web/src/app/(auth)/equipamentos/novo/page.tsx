import { PageContainer } from "@/app/(auth)/components/page-container";
import { EquipamentoForm } from "../components/equipamento-form";

export default function NovoEquipamentoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo equipamento</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4 mb-4">
				<EquipamentoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

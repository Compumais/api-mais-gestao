import { PageContainer } from "@/app/(auth)/components/page-container";
import { HierarquiaForm } from "../components/hierarquia-form";

export default function NovaHierarquiaPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Nova Hierarquia</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<HierarquiaForm modo="criar" />
			</div>
		</PageContainer>
	);
}

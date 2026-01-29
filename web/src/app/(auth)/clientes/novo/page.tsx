import { PageContainer } from "@/app/(auth)/components/page-container";
import { ClientForm } from "../components/client-form";

export default function NovoClientePage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo Cliente</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<ClientForm modo="criar" />
			</div>
		</PageContainer>
	);
}

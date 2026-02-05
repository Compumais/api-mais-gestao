import { PageContainer } from "@/app/(auth)/components/page-container";
import { BancoForm } from "../components/banco-form";

export default function NovoBancoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo Banco</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<BancoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

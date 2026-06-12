import { PageContainer } from "@/app/(auth)/components/page-container";
import { ProdutoForm } from "../components/produto-form";

export default function NovoProdutoPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo Produto</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<ProdutoForm modo="criar" />
			</div>
		</PageContainer>
	);
}

import { PageContainer } from "@/app/(auth)/components/page-container";
import { SupplierForm } from "../components/supplier-form";

export default function NovoFornecedorPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo Fornecedor</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<SupplierForm modo="criar" />
			</div>
		</PageContainer>
	);
}

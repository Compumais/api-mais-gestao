import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarFornecedorClient } from "./editar-fornecedor-client";

type EditarFornecedorPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarFornecedorPage({
	params,
}: EditarFornecedorPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Fornecedor</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarFornecedorClient id={id} />
			</div>
		</PageContainer>
	);
}

import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarProdutoClient } from "./editar-produto-client";

type EditarProdutoPageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditarProdutoPage({
	params,
}: EditarProdutoPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Produto</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarProdutoClient id={id} />
			</div>
		</PageContainer>
	);
}

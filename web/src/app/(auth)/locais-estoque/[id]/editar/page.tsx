import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarLocalEstoqueClient } from "./editar-local-estoque-client";

type EditarLocalEstoquePageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditarLocalEstoquePage({
	params,
}: EditarLocalEstoquePageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Local de Estoque</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<EditarLocalEstoqueClient id={id} />
			</div>
		</PageContainer>
	);
}

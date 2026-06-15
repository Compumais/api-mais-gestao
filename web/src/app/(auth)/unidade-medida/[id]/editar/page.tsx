import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarUnidadeMedidaClient } from "./editar-unidade-medida-client";

type EditarUnidadeMedidaPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarUnidadeMedidaPage({
	params,
}: EditarUnidadeMedidaPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Unidade de Medida</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarUnidadeMedidaClient id={id} />
			</div>
		</PageContainer>
	);
}

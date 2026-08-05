import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarServicoClient } from "./editar-servico-client";

type EditarServicoPageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditarServicoPage({
	params,
}: EditarServicoPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Serviço</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<EditarServicoClient id={id} />
			</div>
		</PageContainer>
	);
}

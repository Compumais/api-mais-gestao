import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarClienteClient } from "./editar-cliente-client";

type EditarClientePageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarClientePage({
	params,
}: EditarClientePageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Cliente</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarClienteClient id={id} />
			</div>
		</PageContainer>
	);
}

import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarPlanoContasClient } from "./editar-plano-contas-client";

type EditarPlanoContasPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarPlanoContasPage({
	params,
}: EditarPlanoContasPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar plano de contas</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarPlanoContasClient id={id} />
			</div>
		</PageContainer>
	);
}

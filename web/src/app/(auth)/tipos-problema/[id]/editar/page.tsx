import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarTipoProblemaClient } from "./editar-tipo-problema-client";

type EditarTipoProblemaPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarTipoProblemaPage({
	params,
}: EditarTipoProblemaPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar tipo de problema</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarTipoProblemaClient id={id} />
			</div>
		</PageContainer>
	);
}

import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarContaCorrenteClient } from "./editar-conta-corrente-client";

type EditarContaCorrentePageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarContaCorrentePage({
	params,
}: EditarContaCorrentePageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Conta Corrente</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarContaCorrenteClient id={id} />
			</div>
		</PageContainer>
	);
}

import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarTipoCobrancaClient } from "./editar-tipo-cobranca-client";

type EditarTipoCobrancaPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarTipoCobrancaPage({
	params,
}: EditarTipoCobrancaPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar tipo de cobrança</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarTipoCobrancaClient id={id} />
			</div>
		</PageContainer>
	);
}

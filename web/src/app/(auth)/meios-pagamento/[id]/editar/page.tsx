import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarMeioPagamentoClient } from "./editar-meio-pagamento-client";

type EditarMeioPagamentoPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarMeioPagamentoPage({
	params,
}: EditarMeioPagamentoPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar meio de pagamento</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarMeioPagamentoClient id={id} />
			</div>
		</PageContainer>
	);
}

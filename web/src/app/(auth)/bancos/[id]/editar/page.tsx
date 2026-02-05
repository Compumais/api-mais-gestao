import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarBancoClient } from "./editar-banco-client";

type EditarBancoPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarBancoPage({
	params,
}: EditarBancoPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Banco</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<EditarBancoClient id={id} />
			</div>
		</PageContainer>
	);
}

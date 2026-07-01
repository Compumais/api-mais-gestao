import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarFatorConversaoClient } from "./editar-fator-conversao-client";

type EditarFatorConversaoPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarFatorConversaoPage({
	params,
}: EditarFatorConversaoPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Fator de Conversão</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<EditarFatorConversaoClient id={id} />
			</div>
		</PageContainer>
	);
}

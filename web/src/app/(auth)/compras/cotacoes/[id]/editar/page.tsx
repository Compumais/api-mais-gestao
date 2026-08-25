import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarCotacaoClient } from "./editar-cotacao-client";

type Props = { params: Promise<{ id: string }> };

export default async function EditarCotacaoPage({ params }: Props) {
	const { id } = await params;
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar cotação</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<EditarCotacaoClient id={id} />
			</div>
		</PageContainer>
	);
}

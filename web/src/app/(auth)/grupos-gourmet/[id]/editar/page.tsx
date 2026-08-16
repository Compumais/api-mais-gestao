import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarGrupoGourmetClient } from "./editar-grupo-gourmet-client";

type EditarGrupoGourmetPageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditarGrupoGourmetPage({
	params,
}: EditarGrupoGourmetPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar grupo gourmet</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<EditarGrupoGourmetClient id={id} />
			</div>
		</PageContainer>
	);
}

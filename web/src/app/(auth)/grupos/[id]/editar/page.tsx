import { PageContainer } from "@/app/(auth)/components/page-container";
import { EditarHierarquiaClient } from "./editar-hierarquia-client";

type EditarHierarquiaPageProps = {
	params: Promise<{ id: string }>;
};

export default async function EditarHierarquiaPage({
	params,
}: EditarHierarquiaPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Hierarquia</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<EditarHierarquiaClient id={id} />
			</div>
		</PageContainer>
	);
}

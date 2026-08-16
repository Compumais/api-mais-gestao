import { PageContainer } from "@/app/(auth)/components/page-container";
import { GrupoGourmetForm } from "../components/grupo-gourmet-form";

export default function NovoGrupoGourmetPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo grupo gourmet</h1>
			</div>
			<div className="mx-4 rounded-lg border bg-card p-4">
				<GrupoGourmetForm modo="criar" />
			</div>
		</PageContainer>
	);
}

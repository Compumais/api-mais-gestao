import { PageContainer } from "@/app/(auth)/components/page-container";
import { UsuarioForm } from "../../components/usuario-form";

type EditarUsuarioPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EditarUsuarioPage({
	params,
}: EditarUsuarioPageProps) {
	const { id } = await params;

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Editar Usuário</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<UsuarioForm modo="editar" usuarioId={id} />
			</div>
		</PageContainer>
	);
}


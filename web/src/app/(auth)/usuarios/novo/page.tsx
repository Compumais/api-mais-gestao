import { PageContainer } from "@/app/(auth)/components/page-container";
import { UsuarioForm } from "../components/usuario-form";

export default function NovoUsuarioPage() {
	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">Novo Usuário</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<UsuarioForm modo="criar" />
			</div>
		</PageContainer>
	);
}

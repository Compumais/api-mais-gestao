"use client";

import { redirect, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "../../components/page-container";

export default function NovaEmpresaPage() {
	const { user, isLoading } = useAuth();
	const router = useRouter();

	if (user?.perfil !== "proprietario" && !isLoading) {
		redirect("/dashboard");
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between p-4">
					<h1 className="text-2xl font-bold">Nova empresa</h1>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<form>
						<div className="grid grid-cols-3 w-full items-center gap-1.5">
							<div className="space-y-2">
								<Label htmlFor="nome">Nome</Label>
								<Input id="nome" placeholder="Nome da empresa" />
							</div>

							<div className="space-y-2">
								<Label htmlFor="cnpj">CNPJ</Label>
								<Input id="cnpj" placeholder="CNPJ da empresa" />
							</div>

							<div className="space-y-2">
								<Label htmlFor="telefone">Telefone</Label>
								<Input id="telefone" placeholder="Telefone da empresa" />
							</div>
						</div>

						<div className="flex justify-end gap-2 mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.back()}
							>
								Cancelar
							</Button>
							<Button type="submit">Criar empresa</Button>
						</div>
					</form>
				</div>
			</div>
		</PageContainer>
	);
}

"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlanoContasTree } from "@/app/(auth)/plano-contas/componentes/plano-contas-tree";
import { Button } from "@/components/ui/button";
import { PageContainer } from "../components/page-container";

export default function PlanoContasPage() {
	const router = useRouter();

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Verifica se não está digitando em um input
			const isInputFocused =
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement;

			if (isInputFocused) return; // Ignora se e	ver digitando

			// F2 - Redireciona para Inclusão
			if (event.key === "F2") {
				event.preventDefault();
				router.push("/plano-contas/novo");
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [router]);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between p-4">
					<h1 className="text-2xl font-bold">Plano de contas</h1>

					<Button asChild>
						<Link href="/plano-contas/novo">
							<PlusIcon className="h-4 w-4" />
							Incluir (F2)
						</Link>
					</Button>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<PlanoContasTree />
				</div>
			</div>
		</PageContainer>
	);
}

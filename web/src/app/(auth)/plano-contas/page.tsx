"use client";

import { useMutation } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImportarPlanoContasDialog } from "@/app/(auth)/plano-contas/componentes/importar-plano-contas-dialog";
import { PlanoContasTree } from "@/app/(auth)/plano-contas/componentes/plano-contas-tree";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	type FormatoImportacaoPlanoContas,
	planoContasService,
} from "@/services/plano-contas.service";
import { PageContainer } from "../components/page-container";

export default function PlanoContasPage() {
	const router = useRouter();
	const [formatoImportacao, setFormatoImportacao] =
		useState<FormatoImportacaoPlanoContas | null>(null);

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

	const baixarModeloMutation = useMutation({
		mutationFn: async (formato: FormatoImportacaoPlanoContas) => {
			const blob = await planoContasService.baixarTemplate(formato);
			return { blob, formato };
		},
		onSuccess: ({ blob, formato }) => {
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `modelo-plano-de-contas.${formato}`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			toast.success("Modelo baixado com sucesso");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao baixar modelo");
		},
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-2 p-4">
					<h1 className="text-2xl font-bold">Plano de contas</h1>

					<div className="flex flex-wrap items-center gap-2">
						<div className="inline-flex -space-x-px rounded-md shadow-xs">
							<Button
								variant="outline"
								className="rounded-r-none"
								onClick={() => setFormatoImportacao("csv")}
							>
								<FileText className="h-4 w-4" aria-hidden="true" />
								Importar CSV
							</Button>
							<Button
								variant="outline"
								className="rounded-none"
								onClick={() => setFormatoImportacao("xlsx")}
							>
								<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
								Importar XLSX
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										className="rounded-l-none"
										disabled={baixarModeloMutation.isPending}
									>
										<Download className="h-4 w-4" aria-hidden="true" />
										Baixar Modelo
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => baixarModeloMutation.mutate("csv")}
									>
										Modelo CSV
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => baixarModeloMutation.mutate("xlsx")}
									>
										Modelo XLSX
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						<Button asChild>
							<Link href="/plano-contas/novo">
								<PlusIcon className="h-4 w-4" />
								Incluir (F2)
							</Link>
						</Button>
					</div>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<PlanoContasTree />
				</div>
			</div>

			<ImportarPlanoContasDialog
				formato={formatoImportacao}
				onFechar={() => setFormatoImportacao(null)}
			/>
		</PageContainer>
	);
}

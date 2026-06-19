"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEmpresa } from "@/hooks/use-empresa";
import { ordenarPlanoContasPorCodigo } from "@/lib/plano-contas-utils";
import { planoContasService } from "@/services/plano-contas.service";
import { Button } from "../../../../components/ui/button";
import { PlanoContasTreeEmpty } from "./empty";
import { PlanoContasTreeLoading } from "./loading";
import { TreeNode } from "./tree-node";

export function PlanoContasTree() {
	const { localStorageEmpresa: empresa } = useEmpresa();

	// Carrega apenas os planos de contas raiz (sem pai)
	// O React Query refaz automaticamente quando empresa?.id muda (faz parte da query key)
	const { data, isLoading, isError, error } = useQuery({
		queryKey: ["plano-contas", empresa?.id],
		queryFn: () =>
			planoContasService.listar({
				idempresa: empresa?.id,
				limit: 100,
			}),
		enabled: !!empresa?.id,
	});

	if (!empresa?.id) {
		return (
			<div className="flex items-center justify-center py-8 text-muted-foreground">
				Selecione uma empresa para visualizar o plano de contas
			</div>
		);
	}

	if (isLoading) {
		return <PlanoContasTreeLoading />;
	}

	if (isError) {
		const errorMessage =
			error instanceof Error
				? error.message
				: typeof error === "string"
					? error
					: "Erro desconhecido ao carregar plano de contas";
		return (
			<div className="flex items-center justify-center py-8 text-destructive">
				{errorMessage}
			</div>
		);
	}

	if (!data || data.data.length === 0) {
		return <PlanoContasTreeEmpty />;
	}

	// Filtra apenas os itens raiz (sem pai)
	const rootItems = ordenarPlanoContasPorCodigo(
		data.data.filter((item) => !item.idplanocontas),
	);

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				{rootItems.map((node) => (
					<TreeNode key={node.id} node={node} />
				))}
			</div>
		</div>
	);
}

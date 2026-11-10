"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { localEstoqueService } from "@/services/local-estoque.service";
import { LocalEstoqueForm } from "../../components/local-estoque-form";

type EditarLocalEstoqueClientProps = {
	id: string;
};

export function EditarLocalEstoqueClient({
	id,
}: EditarLocalEstoqueClientProps) {
	const {
		data: localEstoque,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ["local-estoque", id],
		queryFn: () => localEstoqueService.buscar(id),
	});

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-1/2" />
			</div>
		);
	}

	if (isError || !localEstoque) {
		return (
			<p className="text-destructive">Erro ao carregar local de estoque</p>
		);
	}

	return (
		<LocalEstoqueForm
			modo="editar"
			localId={id}
			valoresIniciais={localEstoque}
		/>
	);
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { produtosService } from "@/services/produtos.service";
import { ProdutoForm } from "../../components/produto-form";
import { mapProdutoToForm } from "../../map-produto-form";

type EditarProdutoClientProps = {
	id: string;
};

export function EditarProdutoClient({ id }: EditarProdutoClientProps) {
	const { data, isLoading } = useQuery({
		queryKey: ["produto", id],
		queryFn: async () => {
			return await produtosService.buscar(id);
		},
	});

	const valoresIniciais = useMemo(
		() => (data ? mapProdutoToForm(data) : undefined),
		[data],
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!data || !valoresIniciais) {
		return (
			<div className="flex items-center justify-center py-8">
				<p className="text-muted-foreground">Produto não encontrado.</p>
			</div>
		);
	}

	return (
		<ProdutoForm
			key={id}
			modo="editar"
			produtoId={id}
			valoresIniciais={valoresIniciais}
		/>
	);
}

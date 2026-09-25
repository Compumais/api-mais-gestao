"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { produtosService } from "@/services/produtos.service";
import { ProdutoForm } from "../components/produto-form";
import { mapProdutoParaClone } from "../map-produto-form";

export function NovoProdutoClient() {
	const searchParams = useSearchParams();
	const clonarId = searchParams.get("clonar");

	const { data, isLoading, isError } = useQuery({
		queryKey: ["produto", clonarId, "clonar"],
		queryFn: async () => {
			if (!clonarId) throw new Error("Produto origem não informado");
			return await produtosService.buscar(clonarId);
		},
		enabled: !!clonarId,
	});

	const valoresIniciais = useMemo(
		() => (data ? mapProdutoParaClone(data) : undefined),
		[data],
	);

	const titulo = clonarId ? "Clonar Produto" : "Novo Produto";

	if (clonarId && isLoading) {
		return (
			<>
				<div className="flex items-center justify-between p-4">
					<h1 className="text-2xl font-bold">{titulo}</h1>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<div className="flex items-center justify-center py-8">
						<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					</div>
				</div>
			</>
		);
	}

	if (clonarId && (isError || !valoresIniciais)) {
		return (
			<>
				<div className="flex items-center justify-between p-4">
					<h1 className="text-2xl font-bold">{titulo}</h1>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<div className="flex items-center justify-center py-8">
						<p className="text-muted-foreground">
							Produto de origem não encontrado para clonar.
						</p>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<div className="flex items-center justify-between p-4">
				<h1 className="text-2xl font-bold">{titulo}</h1>
			</div>
			<div className="rounded-lg border bg-card p-4 mx-4">
				<ProdutoForm
					key={clonarId ? `clonar-${clonarId}` : "novo"}
					modo="criar"
					valoresIniciais={valoresIniciais}
					chaveRascunho={
						clonarId ? `/produtos/novo?clonar=${clonarId}` : "/produtos/novo"
					}
				/>
			</div>
		</>
	);
}

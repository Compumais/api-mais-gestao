"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { produtosService } from "@/services/produtos.service";
import { ProdutoForm } from "../components/produto-form";
import {
	mapProdutoParaClone,
	mapProdutoParaVariacao,
} from "../map-produto-form";

export function NovoProdutoClient() {
	const searchParams = useSearchParams();
	const variacaoDeId = searchParams.get("variacaoDe");
	const clonarId = variacaoDeId ? null : searchParams.get("clonar");
	const origemId = variacaoDeId ?? clonarId;

	const { data, isLoading, isError } = useQuery({
		queryKey: ["produto", origemId, variacaoDeId ? "variacao" : "clonar"],
		queryFn: async () => {
			if (!origemId) throw new Error("Produto origem não informado");
			return await produtosService.buscar(origemId);
		},
		enabled: !!origemId,
	});

	const valoresIniciais = useMemo(() => {
		if (!data) return undefined;
		return variacaoDeId
			? mapProdutoParaVariacao(data)
			: mapProdutoParaClone(data);
	}, [data, variacaoDeId]);

	const titulo = variacaoDeId
		? "Nova variação"
		: clonarId
			? "Clonar Produto"
			: "Novo Produto";

	if (origemId && isLoading) {
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

	if (origemId && (isError || !valoresIniciais)) {
		return (
			<>
				<div className="flex items-center justify-between p-4">
					<h1 className="text-2xl font-bold">{titulo}</h1>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<div className="flex items-center justify-center py-8">
						<p className="text-muted-foreground">
							{variacaoDeId
								? "Produto pai não encontrado para criar a variação."
								: "Produto de origem não encontrado para clonar."}
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
					key={
						variacaoDeId
							? `variacao-${variacaoDeId}`
							: clonarId
								? `clonar-${clonarId}`
								: "novo"
					}
					modo="criar"
					valoresIniciais={valoresIniciais}
					idprodutopai={variacaoDeId}
					nomeProdutoPai={variacaoDeId ? data?.nome : null}
					chaveRascunho={
						variacaoDeId
							? `/produtos/novo?variacaoDe=${variacaoDeId}`
							: clonarId
								? `/produtos/novo?clonar=${clonarId}`
								: "/produtos/novo"
					}
				/>
			</div>
		</>
	);
}

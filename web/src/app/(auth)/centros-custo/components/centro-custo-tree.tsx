"use client";

import { useQuery } from "@tanstack/react-query";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CentroCustoNoArvore,
	centroCustoService,
} from "@/services/centro-custo.service";
import { CentroCustoTreeNode } from "./centro-custo-tree-node";

export function CentroCustoTree() {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data, isLoading, isError } = useQuery({
		queryKey: ["centros-custo", "arvore", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return centroCustoService.listar({
				idempresa: empresa.id,
				formato: "arvore",
			});
		},
		enabled: !!empresa,
	});

	if (!empresa) {
		return (
			<p className="text-center text-muted-foreground py-8">
				Selecione uma empresa para visualizar os centros de custo
			</p>
		);
	}

	if (isLoading) {
		return <p className="text-muted-foreground py-4">Carregando...</p>;
	}

	if (isError) {
		return (
			<p className="text-destructive py-4">
				Erro ao carregar centros de custo.
			</p>
		);
	}

	const nos = (data?.data ?? []) as CentroCustoNoArvore[];

	if (!nos.length) {
		return (
			<p className="text-center text-muted-foreground py-8">
				Nenhum centro de custo cadastrado.
			</p>
		);
	}

	return (
		<div className="space-y-1">
			{nos.map((node) => (
				<CentroCustoTreeNode key={node.id} node={node} />
			))}
		</div>
	);
}

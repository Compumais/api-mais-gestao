import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
	agruparProdutosPorGrupo,
	filtrarHierarquiasGarcom,
	filtrarProdutosGarcom,
	type GrupoProdutos,
} from "@/lib/garcom-utils";
import type { Hierarquia } from "@/services/hierarquias.service";
import { hierarquiasService } from "@/services/hierarquias.service";
import { produtosService } from "@/services/produtos.service";

export function useProdutosGarcom(idempresa: string | undefined) {
	const { data: hierarquiasData, isLoading: isLoadingHierarquias } = useQuery({
		queryKey: ["garcom-hierarquias", idempresa],
		queryFn: () =>
			hierarquiasService.listar({ idempresa: idempresa!, limit: 100 }),
		enabled: !!idempresa,
	});

	const { data: produtosData, isLoading: isLoadingProdutos } = useQuery({
		queryKey: ["garcom-produtos", idempresa],
		queryFn: () =>
			produtosService.listar({
				idempresa: idempresa!,
				inativo: 0,
				limit: 100,
			}),
		enabled: !!idempresa,
	});

	const grupos: Hierarquia[] = useMemo(() => {
		const todas = hierarquiasData?.data ?? [];
		return filtrarHierarquiasGarcom(todas);
	}, [hierarquiasData]);

	const produtosPorGrupo: GrupoProdutos[] = useMemo(() => {
		const gruposIds = new Set(grupos.map((g) => g.id));
		const produtos = filtrarProdutosGarcom(produtosData?.data ?? [], gruposIds);
		return agruparProdutosPorGrupo(produtos, grupos);
	}, [grupos, produtosData]);

	return {
		grupos,
		produtosPorGrupo,
		isLoading: isLoadingHierarquias || isLoadingProdutos,
	};
}

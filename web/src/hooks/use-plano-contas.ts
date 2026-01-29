"use client";

import { useQuery } from "@tanstack/react-query";
import { planoContasService } from "@/services/plano-contas.service";

interface UsePlanoContasParams {
	idempresa?: string;
	idplanocontas?: string;
	inativo?: 0 | 1;
	limit?: number;
	page?: number;
	enabled?: boolean;
}

export function usePlanoContas(params: UsePlanoContasParams = {}) {
	const {
		idempresa,
		idplanocontas,
		inativo,
		limit = 100,
		page,
		enabled = true,
	} = params;

	return useQuery({
		queryKey: [
			"plano-contas",
			"list",
			idplanocontas || "root",
			idempresa,
			inativo,
			page,
		],
		queryFn: () =>
			planoContasService.listar({
				idempresa,
				idplanocontas,
				inativo,
				limit,
				page,
			}),
		enabled: !!idempresa && enabled,
		staleTime: 0, // Sempre considerar stale quando empresa muda
		gcTime: 5 * 60 * 1000, // 5 minutos para limpar cache antigo
		refetchOnWindowFocus: false,
	});
}

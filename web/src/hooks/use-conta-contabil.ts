"use client";

import { useQuery } from "@tanstack/react-query";
import { contaContabilService } from "@/services/conta-contabil.service";

interface UseContaContabilParams {
	idempresa?: string;
	descricao?: string;
	q?: string;
	codigoreduzido?: string;
	codigoextenso?: string;
	natureza?: string;
	tipocontacontabil?: string;
	inativo?: number;
	situacaoCodigo?: "com" | "sem";
	ordenarPor?: string | null;
	ordem?: "asc" | "desc" | null;
	limit?: number;
	page?: number;
	enabled?: boolean;
}

export function useContaContabil(params: UseContaContabilParams = {}) {
	const {
		idempresa,
		descricao,
		q,
		codigoreduzido,
		codigoextenso,
		natureza,
		tipocontacontabil,
		inativo,
		situacaoCodigo,
		ordenarPor,
		ordem,
		limit = 10,
		page = 1,
		enabled = true,
	} = params;

	return useQuery({
		queryKey: [
			"conta-contabil",
			"list",
			idempresa,
			descricao,
			q,
			codigoreduzido,
			codigoextenso,
			natureza,
			tipocontacontabil,
			inativo,
			situacaoCodigo,
			ordenarPor,
			ordem,
			page,
			limit,
		],
		queryFn: () =>
			contaContabilService.listar({
				idempresa,
				descricao,
				q,
				codigoreduzido,
				codigoextenso,
				natureza,
				tipocontacontabil,
				inativo,
				situacaoCodigo,
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
				limit,
				page,
			}),
		enabled: !!idempresa && enabled,
		staleTime: 0,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}

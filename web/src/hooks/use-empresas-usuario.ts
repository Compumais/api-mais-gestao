"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { Empresa } from "@/provider/empresa-provider";
import { empresasService } from "@/services/empresas.service";

export const EMPRESAS_USUARIO_QUERY_KEY = "empresas-usuario";

export async function buscarEmpresasUsuario(userId: string): Promise<Empresa[]> {
	const { data } = await empresasService.listar({
		idusuario: userId,
		idproprietario: userId,
	});
	return data;
}

export function empresasUsuarioQueryOptions(userId: string) {
	return queryOptions<Empresa[]>({
		queryKey: [EMPRESAS_USUARIO_QUERY_KEY, userId],
		queryFn: () => buscarEmpresasUsuario(userId),
		staleTime: 1000 * 60 * 5,
		retry: 2,
		retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 3000),
		refetchOnWindowFocus: false,
	});
}

export function useEmpresasUsuario() {
	const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();

	return useQuery({
		...empresasUsuarioQueryOptions(user?.id ?? ""),
		enabled: !!user?.id && isAuthenticated && !isLoadingAuth,
	});
}

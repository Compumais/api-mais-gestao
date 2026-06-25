"use client";

import { useQuery } from "@tanstack/react-query";
import { nfeConfiguracaoService } from "@/services/nfe-configuracao.service";

export function useNfeConfiguracao(idempresa: string | null | undefined) {
	const { data, isLoading } = useQuery({
		queryKey: ["nfe-configuracao", idempresa],
		queryFn: () => nfeConfiguracaoService.buscar(idempresa!),
		enabled: !!idempresa,
	});

	return {
		nfeConfiguracao: data,
		carregando: isLoading,
	};
}

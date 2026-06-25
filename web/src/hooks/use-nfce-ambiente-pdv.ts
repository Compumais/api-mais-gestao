"use client";

import { useQuery } from "@tanstack/react-query";
import { useEmpresa } from "@/hooks/use-empresa";
import { nfceConfiguracaoService } from "@/services/nfce-configuracao.service";

export function useNfceAmbientePdv() {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const { data, isLoading } = useQuery({
		queryKey: ["nfce-config-pdv", empresa?.id],
		queryFn: () => nfceConfiguracaoService.buscar(empresa!.id),
		enabled: !!empresa?.id,
		staleTime: 5 * 60 * 1000,
	});

	return {
		ambiente: data?.ambiente ?? null,
		isLoading,
	};
}

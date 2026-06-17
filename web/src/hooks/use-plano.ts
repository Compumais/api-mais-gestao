"use client";

import { useQuery } from "@tanstack/react-query";
import { getMeuPlano } from "@/services/planos.service";
import { useEmpresa } from "./use-empresa";

const PLANO_LIBERADO = "ENTERPRISE";

export function usePlano() {
	const { localStorageEmpresa } = useEmpresa();
	const idempresa = localStorageEmpresa?.id;

	const { data: planoData, isLoading } = useQuery({
		queryKey: ["meu-plano", idempresa],
		queryFn: () => getMeuPlano(idempresa),
		staleTime: 1000 * 60 * 30,
	});

	const plano = (planoData?.plano ?? PLANO_LIBERADO).toUpperCase();

	return {
		plano: planoData?.plano ?? PLANO_LIBERADO,
		planoAgendado: planoData?.planoAgendado || null,
		inicioCiclo: planoData?.inicioCiclo,
		fimCiclo: planoData?.fimCiclo,
		isLoading,
		isBasic: false,
		isPremium: true,
		isEnterprise: true,
		semPlano: false,
	};
}

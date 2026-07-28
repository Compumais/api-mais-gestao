"use client";

import { useQuery } from "@tanstack/react-query";
import { getMeuPlano } from "@/services/planos.service";
import { useEmpresa } from "./use-empresa";

const LIMITES_PADRAO = {
	maxempresas: 0,
	maxusuarios: 0,
};

export function usePlano() {
	const { localStorageEmpresa } = useEmpresa();
	const idempresa = localStorageEmpresa?.id;

	const { data: planoData, isLoading } = useQuery({
		queryKey: ["meu-plano", idempresa],
		queryFn: () => getMeuPlano(idempresa),
		staleTime: 1000 * 60 * 30,
	});

	const plano = planoData?.plano ?? null;

	return {
		plano,
		planoAgendado: planoData?.planoAgendado || null,
		inicioCiclo: planoData?.inicioCiclo,
		fimCiclo: planoData?.fimCiclo,
		status: planoData?.status,
		isLoading,
		isBasic: plano === "BASIC",
		isPremium: plano === "PREMIUM",
		isEnterprise: plano === "ENTERPRISE",
		semPlano: plano === null,
	};
}

export function useEntitlements() {
	const { localStorageEmpresa } = useEmpresa();
	const idempresa = localStorageEmpresa?.id;
	const { data, isLoading } = useQuery({
		queryKey: ["meu-plano", idempresa],
		queryFn: () => getMeuPlano(idempresa),
		staleTime: 1000 * 60 * 30,
	});

	const features = data?.features ?? [];
	const modulos = data?.modulos ?? [];
	const limites = data?.limites ?? LIMITES_PADRAO;

	return {
		...data,
		features,
		modulos,
		limites,
		isLoading,
		hasFeature: (codigo: string) => features.includes(codigo),
		hasModulo: (codigo: string) => modulos.includes(codigo),
	};
}

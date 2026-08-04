"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getMeuPlano } from "@/services/planos.service";
import { useEmpresa } from "./use-empresa";

const LIMITES_PADRAO = {
	maxempresas: 0,
	maxusuarios: 0,
};

export function usePlano() {
	const { user } = useAuth();
	const { localStorageEmpresa } = useEmpresa();
	const idempresa = localStorageEmpresa?.id;
	const idusuario = user?.id;

	const { data: planoData, isLoading } = useQuery({
		queryKey: ["meu-plano", idusuario, idempresa],
		queryFn: () => getMeuPlano(idempresa),
		enabled: !!idusuario,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 1000 * 60 * 60,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
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
	const { user } = useAuth();
	const { localStorageEmpresa } = useEmpresa();
	const idempresa = localStorageEmpresa?.id;
	const idusuario = user?.id;

	const { data, isLoading } = useQuery({
		queryKey: ["meu-plano", idusuario, idempresa],
		queryFn: () => getMeuPlano(idempresa),
		enabled: !!idusuario,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 1000 * 60 * 60,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	const features = data?.features ?? [];
	const modulos = data?.modulos ?? [];
	const limites = data?.limites ?? LIMITES_PADRAO;

	return {
		...data,
		features,
		modulos,
		limites,
		isLoading: !idusuario || isLoading,
		hasFeature: (codigo: string) => features.includes(codigo),
		hasModulo: (codigo: string) => modulos.includes(codigo),
	};
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMeuPlano } from "@/services/planos.service";
import { useEmpresa } from "./use-empresa";

const LIMITES_PADRAO = {
	maxempresas: 0,
	maxusuarios: 0,
};
const LISTA_VAZIA: string[] = [];

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

	const features = data?.features ?? LISTA_VAZIA;
	const modulos = data?.modulos ?? LISTA_VAZIA;
	const limites = data?.limites ?? LIMITES_PADRAO;

	const hasFeature = useCallback(
		(codigo: string) => features.includes(codigo),
		[features],
	);
	const hasModulo = useCallback(
		(codigo: string) => modulos.includes(codigo),
		[modulos],
	);

	return useMemo(
		() => ({
			...data,
			features,
			modulos,
			limites,
			isLoading: !idusuario || isLoading,
			hasFeature,
			hasModulo,
		}),
		[data, features, modulos, limites, idusuario, isLoading, hasFeature, hasModulo],
	);
}

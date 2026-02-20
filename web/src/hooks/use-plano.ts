"use client";

import { useQuery } from "@tanstack/react-query";
import { getMeuPlano } from "@/services/planos.service";

export function usePlano() {
    const { data: planoData, isLoading } = useQuery({
        queryKey: ["meu-plano"],
        queryFn: () => getMeuPlano(),
        staleTime: 1000 * 60 * 30, // 30 minutos
    });

    const plano = planoData?.plano?.toUpperCase();
    const isPremium =
        plano === "PREMIUM" ||
        plano === "ENTERPRISE";
    const isEnterprise = plano === "ENTERPRISE";
    const isBasic = plano === "BASIC";
    const semPlano = !plano || planoData?.status === "SEM_PLANO";

    return {
        plano: planoData?.plano || null,
        planoAgendado: planoData?.planoAgendado || null,
        inicioCiclo: planoData?.inicioCiclo,
        fimCiclo: planoData?.fimCiclo,
        isLoading,
        isBasic,
        isPremium,
        isEnterprise,
        semPlano,
    };
}

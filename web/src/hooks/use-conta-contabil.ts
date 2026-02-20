"use client";

import { useQuery } from "@tanstack/react-query";
import { contaContabilService } from "@/services/conta-contabil.service";

interface UseContaContabilParams {
    idempresa?: string;
    descricao?: string;
    limit?: number;
    page?: number;
    enabled?: boolean;
}

export function useContaContabil(params: UseContaContabilParams = {}) {
    const { idempresa, descricao, limit = 10, page = 1, enabled = true } = params;

    return useQuery({
        queryKey: ["conta-contabil", "list", idempresa, descricao, page, limit],
        queryFn: () =>
            contaContabilService.listar({
                idempresa,
                descricao,
                limit,
                page,
            }),
        enabled: !!idempresa && enabled,
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

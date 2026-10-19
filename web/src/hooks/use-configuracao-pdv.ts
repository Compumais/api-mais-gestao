"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	type ConfiguracaoPdv,
	configuracaoPdvService,
} from "@/services/configuracao-pdv.service";

export function useConfiguracaoPdv(idempresa: string | null | undefined) {
	return useQuery({
		queryKey: ["configuracao-pdv", idempresa],
		queryFn: () => configuracaoPdvService.buscar(idempresa!),
		enabled: !!idempresa,
		staleTime: 30_000,
	});
}

export function useVendaSemEstoque(idempresa: string | null | undefined) {
	const { data } = useConfiguracaoPdv(idempresa);
	return data?.venda_sem_estoque === "1";
}

export function useSalvarConfiguracaoPdv() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			idempresa,
			dados,
		}: {
			idempresa: string;
			dados: Partial<ConfiguracaoPdv>;
		}) => configuracaoPdvService.salvar(idempresa, dados),
		onSuccess: (data, variables) => {
			queryClient.setQueryData(["configuracao-pdv", variables.idempresa], data);
			toast.success("Configuração de estoque atualizada");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao salvar a configuração");
		},
	});
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { configuracaoUsuarioService } from "@/services/configuracao-usuario.service";
import type { IntegracoesUsuario } from "@/services/configuracao-usuario.service";
import { useEmpresa } from "@/hooks/use-empresa";

export function useConfiguracaoUsuario(idempresa?: string) {
	const { localStorageEmpresa } = useEmpresa();
	const empresaSelecionada = idempresa || localStorageEmpresa?.id;

	return useQuery({
		queryKey: ["configuracao-usuario", empresaSelecionada],
		queryFn: () => configuracaoUsuarioService.buscar(empresaSelecionada),
		enabled: true,
		staleTime: 1000 * 60 * 5, // 5 minutos
		refetchOnWindowFocus: false,
	});
}

export function useAtualizarConfiguracaoUsuario() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();

	return useMutation({
		mutationFn: (dados: IntegracoesUsuario) =>
			configuracaoUsuarioService.atualizar(dados),
		onSuccess: () => {
			// Invalidar todas as queries de configuração de usuário
			queryClient.invalidateQueries({
				queryKey: ["configuracao-usuario"],
			});
			toast.success("Configurações atualizadas com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar configurações");
		},
	});
}


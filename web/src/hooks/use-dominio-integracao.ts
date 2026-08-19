"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type AtivarDominioData,
	dominioService,
	type SalvarDominioData,
} from "@/services/dominio.service";

export function useDominioIntegracao(idempresa: string | null | undefined) {
	const queryClient = useQueryClient();

	const integracaoQuery = useQuery({
		queryKey: ["dominio-integracao", idempresa],
		queryFn: () => {
			if (!idempresa) throw new Error("Empresa não selecionada");
			return dominioService.buscar(idempresa);
		},
		enabled: !!idempresa,
	});

	const enviosQuery = useQuery({
		queryKey: ["dominio-envios", idempresa],
		queryFn: () => {
			if (!idempresa) throw new Error("Empresa não selecionada");
			return dominioService.listarEnvios(idempresa, 1, 10);
		},
		enabled: !!idempresa,
	});

	const invalidar = () => {
		void queryClient.invalidateQueries({ queryKey: ["dominio-integracao"] });
		void queryClient.invalidateQueries({ queryKey: ["dominio-envios"] });
	};

	const ativarMutation = useMutation({
		mutationFn: (dados: AtivarDominioData) => dominioService.ativar(dados),
		onSuccess: invalidar,
	});

	const salvarMutation = useMutation({
		mutationFn: (dados: SalvarDominioData) => dominioService.salvar(dados),
		onSuccess: invalidar,
	});

	const reenviarMutation = useMutation({
		mutationFn: ({ id, idempresa: idEmp }: { id: string; idempresa: string }) =>
			dominioService.reenviar(id, idEmp),
		onSuccess: invalidar,
	});

	return {
		integracao: integracaoQuery.data ?? null,
		carregandoIntegracao: integracaoQuery.isLoading,
		envios: enviosQuery.data?.data ?? [],
		carregandoEnvios: enviosQuery.isLoading,
		ativar: ativarMutation.mutateAsync,
		ativando: ativarMutation.isPending,
		salvar: salvarMutation.mutateAsync,
		salvando: salvarMutation.isPending,
		reenviar: reenviarMutation.mutateAsync,
		reenviando: reenviarMutation.isPending,
	};
}

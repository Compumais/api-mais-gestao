"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { configuracaoService } from "@/services/configuracao.service";
import type {
	CriarChaveApiData,
	CriarWebhookData,
	AtualizarWebhookData,
} from "@/services/configuracao.service";

type AtualizarConfiguracaoData = Parameters<
	typeof configuracaoService.atualizar
>[1];

export function useConfiguracao(idempresa: string | null) {
	return useQuery({
		queryKey: ["configuracao", idempresa],
		queryFn: () => {
			if (!idempresa) throw new Error("ID da empresa é obrigatório");
			return configuracaoService.buscar(idempresa);
		},
		enabled: !!idempresa,
		staleTime: 0,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}

export function useAtualizarConfiguracao() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			idempresa,
			dados,
		}: {
			idempresa: string;
			dados: AtualizarConfiguracaoData;
		}) => configuracaoService.atualizar(idempresa, dados),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["configuracao", variables.idempresa],
			});
			toast.success("Configurações atualizadas com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar configurações");
		},
	});
}

export function useAtualizarSecaoConfiguracao() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			idempresa,
			secao,
			dados,
		}: {
			idempresa: string;
			secao: "notificacoes" | "integracao" | "relatorios" | "impressao";
			dados: unknown;
		}) => configuracaoService.atualizarSecao(idempresa, secao, dados),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["configuracao", variables.idempresa],
			});
			toast.success("Configuração atualizada com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar configuração");
		},
	});
}

export function useCriarChaveApi() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			idempresa,
			dados,
		}: {
			idempresa: string;
			dados: CriarChaveApiData;
		}) => configuracaoService.criarChaveApi(idempresa, dados),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["configuracao", variables.idempresa],
			});
			toast.success("Chave de API criada com sucesso!");
			return data;
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar chave de API");
		},
	});
}

export function useDeletarChaveApi() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			idempresa,
			chaveId,
		}: {
			idempresa: string;
			chaveId: string;
		}) => configuracaoService.deletarChaveApi(idempresa, chaveId),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["configuracao", variables.idempresa],
			});
			toast.success("Chave de API deletada com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao deletar chave de API");
		},
	});
}

export function useCriarWebhook() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			idempresa,
			dados,
		}: {
			idempresa: string;
			dados: CriarWebhookData;
		}) => configuracaoService.criarWebhook(idempresa, dados),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["configuracao", variables.idempresa],
			});
			toast.success("Webhook criado com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar webhook");
		},
	});
}

export function useAtualizarWebhook() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			idempresa,
			webhookId,
			dados,
		}: {
			idempresa: string;
			webhookId: string;
			dados: AtualizarWebhookData;
		}) => configuracaoService.atualizarWebhook(idempresa, webhookId, dados),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["configuracao", variables.idempresa],
			});
			toast.success("Webhook atualizado com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar webhook");
		},
	});
}

export function useDeletarWebhook() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			idempresa,
			webhookId,
		}: {
			idempresa: string;
			webhookId: string;
		}) => configuracaoService.deletarWebhook(idempresa, webhookId),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["configuracao", variables.idempresa],
			});
			toast.success("Webhook deletado com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao deletar webhook");
		},
	});
}

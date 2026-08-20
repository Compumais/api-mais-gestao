"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModeloImpressaoPedidoFormData } from "@/schemas/modelo-impressao-pedido.schema";
import { modeloImpressaoPedidoService } from "@/services/modelo-impressao-pedido.service";

export const modeloImpressaoPedidoKeys = {
	lista: (idempresa: string) =>
		["modelos-impressao-pedido", idempresa] as const,
	detalhe: (idempresa: string, id: string) =>
		["modelo-impressao-pedido", idempresa, id] as const,
};

export function useModelosImpressaoPedido(idempresa: string | null) {
	return useQuery({
		queryKey: modeloImpressaoPedidoKeys.lista(idempresa ?? ""),
		queryFn: async () => {
			if (!idempresa) throw new Error("Empresa obrigatória");
			await modeloImpressaoPedidoService.seed(idempresa);
			return modeloImpressaoPedidoService.listar(idempresa);
		},
		enabled: !!idempresa,
	});
}

export function useModeloImpressaoPedido(
	idempresa: string | null,
	id: string | null,
) {
	return useQuery({
		queryKey: modeloImpressaoPedidoKeys.detalhe(idempresa ?? "", id ?? ""),
		queryFn: () => {
			if (!idempresa || !id) throw new Error("Parâmetros obrigatórios");
			return modeloImpressaoPedidoService.buscar(idempresa, id);
		},
		enabled: !!idempresa && !!id,
	});
}

export function useCriarModeloImpressaoPedido(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payload: ModeloImpressaoPedidoFormData) =>
			modeloImpressaoPedidoService.criar(idempresa, payload),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoPedidoKeys.lista(idempresa),
			});
		},
	});
}

export function useAtualizarModeloImpressaoPedido(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			payload,
		}: {
			id: string;
			payload: Partial<ModeloImpressaoPedidoFormData> & { ativo?: boolean };
		}) => modeloImpressaoPedidoService.atualizar(idempresa, id, payload),
		onSuccess: (_data, vars) => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoPedidoKeys.lista(idempresa),
			});
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoPedidoKeys.detalhe(idempresa, vars.id),
			});
		},
	});
}

export function useExcluirModeloImpressaoPedido(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			modeloImpressaoPedidoService.excluir(idempresa, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoPedidoKeys.lista(idempresa),
			});
		},
	});
}

export function useDefinirPrimarioModeloImpressaoPedido(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			modeloImpressaoPedidoService.definirPrimario(idempresa, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoPedidoKeys.lista(idempresa),
			});
		},
	});
}

export function useDuplicarModeloImpressaoPedido(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			modeloImpressaoPedidoService.duplicar(idempresa, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoPedidoKeys.lista(idempresa),
			});
		},
	});
}

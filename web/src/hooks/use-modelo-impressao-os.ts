"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModeloImpressaoOsFormData } from "@/schemas/modelo-impressao-os.schema";
import { modeloImpressaoOsService } from "@/services/modelo-impressao-os.service";

export const modeloImpressaoOsKeys = {
	lista: (idempresa: string) =>
		["modelos-impressao-os", idempresa] as const,
	detalhe: (idempresa: string, id: string) =>
		["modelo-impressao-os", idempresa, id] as const,
};

export function useModelosImpressaoOs(idempresa: string | null) {
	return useQuery({
		queryKey: modeloImpressaoOsKeys.lista(idempresa ?? ""),
		queryFn: async () => {
			if (!idempresa) throw new Error("Empresa obrigatória");
			await modeloImpressaoOsService.seed(idempresa);
			return modeloImpressaoOsService.listar(idempresa);
		},
		enabled: !!idempresa,
	});
}

export function useModeloImpressaoOs(
	idempresa: string | null,
	id: string | null,
) {
	return useQuery({
		queryKey: modeloImpressaoOsKeys.detalhe(idempresa ?? "", id ?? ""),
		queryFn: () => {
			if (!idempresa || !id) throw new Error("Parâmetros obrigatórios");
			return modeloImpressaoOsService.buscar(idempresa, id);
		},
		enabled: !!idempresa && !!id,
	});
}

export function useCriarModeloImpressaoOs(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payload: ModeloImpressaoOsFormData) =>
			modeloImpressaoOsService.criar(idempresa, payload),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoOsKeys.lista(idempresa),
			});
		},
	});
}

export function useAtualizarModeloImpressaoOs(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			payload,
		}: {
			id: string;
			payload: Partial<ModeloImpressaoOsFormData> & { ativo?: boolean };
		}) => modeloImpressaoOsService.atualizar(idempresa, id, payload),
		onSuccess: (_data, vars) => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoOsKeys.lista(idempresa),
			});
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoOsKeys.detalhe(idempresa, vars.id),
			});
		},
	});
}

export function useExcluirModeloImpressaoOs(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			modeloImpressaoOsService.excluir(idempresa, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoOsKeys.lista(idempresa),
			});
		},
	});
}

export function useDefinirPrimarioModeloImpressaoOs(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			modeloImpressaoOsService.definirPrimario(idempresa, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoOsKeys.lista(idempresa),
			});
		},
	});
}

export function useDuplicarModeloImpressaoOs(idempresa: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			modeloImpressaoOsService.duplicar(idempresa, id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: modeloImpressaoOsKeys.lista(idempresa),
			});
		},
	});
}

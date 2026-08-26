"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OnChangeFn, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	configuracaoUsuarioService,
	type LayoutMenuUsuario,
	type PreferenciasUiUsuario,
} from "@/services/configuracao-usuario.service";

export type { LayoutMenuUsuario, PreferenciasUiUsuario };

export const preferenciasUiQueryKey = ["preferencias-ui-usuario"] as const;

export const TABELA_ORDENS_SERVICO = "ordens-servico";

export function usePreferenciasUiUsuario() {
	return useQuery({
		queryKey: preferenciasUiQueryKey,
		queryFn: () => configuracaoUsuarioService.buscarPreferenciasUi(),
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
	});
}

export function useAtualizarPreferenciasUiUsuario() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (dados: PreferenciasUiUsuario) =>
			configuracaoUsuarioService.atualizarPreferenciasUi(dados),
		onSuccess: (dados) => {
			queryClient.setQueryData(preferenciasUiQueryKey, dados);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao salvar preferências de UI");
		},
	});
}

export function useLayoutMenu() {
	const { data: preferencias, isLoading } = usePreferenciasUiUsuario();
	const atualizar = useAtualizarPreferenciasUiUsuario();

	const layoutMenu = preferencias?.layoutMenu ?? "sidebar";

	const setLayoutMenu = useCallback(
		(valor: LayoutMenuUsuario) => {
			atualizar.mutate(
				{ layoutMenu: valor },
				{
					onSuccess: () => {
						toast.success("Layout de menu atualizado");
					},
				},
			);
		},
		[atualizar],
	);

	return {
		layoutMenu,
		isLoading,
		setLayoutMenu,
		isSaving: atualizar.isPending,
	};
}

type UseColunasTabelaPersistidasOpcoes = {
	/** Só hidrata depois que defaults (ex.: config da empresa) estiverem prontos. */
	enabled?: boolean;
};

/**
 * Estado de visibilidade de colunas com persistência debounced no servidor.
 */
export function useColunasTabelaPersistidas(
	chaveTabela: string,
	visibilidadePadrao: VisibilityState,
	opcoes: UseColunasTabelaPersistidasOpcoes = {},
) {
	const { enabled = true } = opcoes;
	const { data: preferencias, isLoading } = usePreferenciasUiUsuario();
	const atualizar = useAtualizarPreferenciasUiUsuario();
	const [columnVisibility, setColumnVisibility] =
		useState<VisibilityState>(visibilidadePadrao);
	const [hidrato, setHidrato] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const atualizarRef = useRef(atualizar);

	useEffect(() => {
		atualizarRef.current = atualizar;
	}, [atualizar]);

	// Hidrata uma vez a partir do servidor (não reaplicar após saves).
	useEffect(() => {
		if (!enabled || isLoading || hidrato) return;
		const salvas = preferencias?.colunasTabelas?.[chaveTabela];
		setColumnVisibility({
			...visibilidadePadrao,
			...(salvas ?? {}),
		});
		setHidrato(true);
	}, [
		enabled,
		isLoading,
		hidrato,
		preferencias,
		chaveTabela,
		visibilidadePadrao,
	]);

	// Quando o catálogo padrão muda (ex.: config/extras), preenche só chaves novas.
	useEffect(() => {
		if (!hidrato) return;
		setColumnVisibility((prev) => ({
			...visibilidadePadrao,
			...prev,
		}));
	}, [visibilidadePadrao, hidrato]);

	const persistir = useCallback(
		(visibilidade: VisibilityState) => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
			debounceRef.current = setTimeout(() => {
				atualizarRef.current.mutate({
					colunasTabelas: {
						[chaveTabela]: visibilidade as Record<string, boolean>,
					},
				});
			}, 400);
		},
		[chaveTabela],
	);

	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	const onColumnVisibilityChange: OnChangeFn<VisibilityState> = useCallback(
		(updater) => {
			setColumnVisibility((prev) => {
				const next = typeof updater === "function" ? updater(prev) : updater;
				persistir(next);
				return next;
			});
		},
		[persistir],
	);

	return {
		columnVisibility,
		onColumnVisibilityChange,
		isLoadingPreferencias: !enabled || isLoading || !hidrato,
	};
}

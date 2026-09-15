"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	type AtualizarContaCorrenteLancamentoData,
	contaCorrenteLancamentoService,
	type CriarContaCorrenteLancamentoData,
} from "@/services/conta-corrente-lancamento.service";

interface UseContaCorrenteLancamentosParams {
	idcontacorrente: string;
	page?: number;
	limit?: number;
	historico?: string;
	documento?: string;
	planocontasnome?: string;
	datahora?: string;
	sentido?: "entrada" | "saida";
	ordenarPor?: string;
	ordem?: "asc" | "desc";
	enabled?: boolean;
}

export function useContaCorrenteLancamentos(
	params: UseContaCorrenteLancamentosParams,
) {
	const {
		idcontacorrente,
		page = 1,
		limit = 10,
		historico,
		documento,
		planocontasnome,
		datahora,
		sentido,
		ordenarPor,
		ordem,
		enabled = true,
	} = params;

	return useQuery({
		queryKey: [
			"conta-corrente-lancamentos",
			"list",
			idcontacorrente,
			page,
			limit,
			historico,
			documento,
			planocontasnome,
			datahora,
			sentido,
			ordenarPor,
			ordem,
		],
		queryFn: () =>
			contaCorrenteLancamentoService.listar({
				idcontacorrente,
				page,
				limit,
				...(historico ? { historico } : {}),
				...(documento ? { documento } : {}),
				...(planocontasnome ? { planocontasnome } : {}),
				...(datahora ? { datahora } : {}),
				...(sentido ? { sentido } : {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			}),
		enabled: !!idcontacorrente && enabled,
		staleTime: 0,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}

export function useContaCorrenteLancamento(id: string | null) {
	return useQuery({
		queryKey: ["conta-corrente-lancamentos", "get", id],
		queryFn: () => {
			if (!id) throw new Error("ID é obrigatório");
			return contaCorrenteLancamentoService.buscar(id);
		},
		enabled: !!id,
		staleTime: 0,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
}

export function useCriarContaCorrenteLancamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (dados: CriarContaCorrenteLancamentoData) =>
			contaCorrenteLancamentoService.criar(dados),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["conta-corrente-lancamentos"],
			});
			toast.success("Movimentação criada com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao criar movimentação");
		},
	});
}

export function useAtualizarContaCorrenteLancamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			dados,
		}: {
			id: string;
			dados: AtualizarContaCorrenteLancamentoData;
		}) => contaCorrenteLancamentoService.atualizar(id, dados),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["conta-corrente-lancamentos"],
			});
			toast.success("Movimentação atualizada com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao atualizar movimentação");
		},
	});
}

export function useDeletarContaCorrenteLancamento() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => contaCorrenteLancamentoService.deletar(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["conta-corrente-lancamentos"],
			});
			toast.success("Movimentação excluída com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir movimentação");
		},
	});
}

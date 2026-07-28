"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	CampoExtraOrdemServico,
	ConfiguracaoOrdemServico,
} from "@/services/ordem-servico.service";
import {
	type AtualizarItemOsData,
	type AtualizarLoteOsData,
	type AtualizarOrdemServicoData,
	type CriarEventoOsData,
	type CriarItemOsData,
	type CriarLoteOsData,
	type CriarOrdemServicoData,
	type GerarContasReceberOsData,
	type GerarNfeRascunhoOsData,
	type ListarOrdensServicoParams,
	ordemServicoService,
} from "@/services/ordem-servico.service";

export const ordemServicoQueryKeys = {
	lista: (params: Partial<ListarOrdensServicoParams>) =>
		["ordens-servico", params] as const,
	detalhe: (id: string) => ["ordem-servico", id] as const,
	itens: (id: string, idempresa: string) =>
		["ordem-servico-itens", id, idempresa] as const,
	lotes: (id: string, iditem: string, idempresa: string) =>
		["ordem-servico-lotes", id, iditem, idempresa] as const,
	eventos: (id: string, idempresa: string) =>
		["ordem-servico-eventos", id, idempresa] as const,
	faturamentos: (id: string, idempresa: string) =>
		["ordem-servico-faturamentos", id, idempresa] as const,
	config: (idempresa: string) =>
		["configuracao-ordem-servico", idempresa] as const,
	tipos: (idempresa: string, somenteAtivos?: boolean) =>
		["tipos-ordem-servico-evento", idempresa, somenteAtivos] as const,
};

export function useOrdensServico(
	params: ListarOrdensServicoParams | null,
	enabled = true,
) {
	return useQuery({
		queryKey: ordemServicoQueryKeys.lista(params ?? {}),
		queryFn: () => {
			if (!params) throw new Error("Parâmetros obrigatórios");
			return ordemServicoService.listar(params);
		},
		enabled: enabled && !!params?.idempresa,
	});
}

export function useOrdemServico(id: string | null) {
	return useQuery({
		queryKey: ordemServicoQueryKeys.detalhe(id ?? ""),
		queryFn: () => {
			if (!id) throw new Error("ID obrigatório");
			return ordemServicoService.buscar(id);
		},
		enabled: !!id,
	});
}

export function useOrdemServicoItens(
	id: string | null,
	idempresa: string | null,
) {
	return useQuery({
		queryKey: ordemServicoQueryKeys.itens(id ?? "", idempresa ?? ""),
		queryFn: () => {
			if (!id || !idempresa) throw new Error("Parâmetros obrigatórios");
			return ordemServicoService.listarItens(id, idempresa);
		},
		enabled: !!id && !!idempresa,
	});
}

export function useOrdemServicoLotes(
	id: string | null,
	iditem: string | null,
	idempresa: string | null,
) {
	return useQuery({
		queryKey: ordemServicoQueryKeys.lotes(
			id ?? "",
			iditem ?? "",
			idempresa ?? "",
		),
		queryFn: () => {
			if (!id || !iditem || !idempresa) {
				throw new Error("Parâmetros obrigatórios");
			}
			return ordemServicoService.listarLotes(id, iditem, idempresa);
		},
		enabled: !!id && !!iditem && !!idempresa,
	});
}

export function useOrdemServicoEventos(
	id: string | null,
	idempresa: string | null,
) {
	return useQuery({
		queryKey: ordemServicoQueryKeys.eventos(id ?? "", idempresa ?? ""),
		queryFn: () => {
			if (!id || !idempresa) throw new Error("Parâmetros obrigatórios");
			return ordemServicoService.listarEventos(id, idempresa);
		},
		enabled: !!id && !!idempresa,
	});
}

export function useOrdemServicoFaturamentos(
	id: string | null,
	idempresa: string | null,
) {
	return useQuery({
		queryKey: ordemServicoQueryKeys.faturamentos(id ?? "", idempresa ?? ""),
		queryFn: () => {
			if (!id || !idempresa) throw new Error("Parâmetros obrigatórios");
			return ordemServicoService.listarFaturamentos(id, idempresa);
		},
		enabled: !!id && !!idempresa,
	});
}

export function useConfiguracaoOrdemServico(idempresa: string | null) {
	return useQuery({
		queryKey: ordemServicoQueryKeys.config(idempresa ?? ""),
		queryFn: () => {
			if (!idempresa) throw new Error("Empresa obrigatória");
			return ordemServicoService.buscarConfiguracao(idempresa);
		},
		enabled: !!idempresa,
	});
}

export function useTiposOrdemServicoEvento(
	idempresa: string | null,
	somenteAtivos?: boolean,
) {
	return useQuery({
		queryKey: ordemServicoQueryKeys.tipos(idempresa ?? "", somenteAtivos),
		queryFn: () => {
			if (!idempresa) throw new Error("Empresa obrigatória");
			return ordemServicoService.listarTiposEvento({
				idempresa,
				somenteAtivos,
			});
		},
		enabled: !!idempresa,
	});
}

function invalidarDominioOs(
	queryClient: ReturnType<typeof useQueryClient>,
	id?: string,
	idempresa?: string,
) {
	void queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
	if (id) {
		void queryClient.invalidateQueries({
			queryKey: ordemServicoQueryKeys.detalhe(id),
		});
		void queryClient.invalidateQueries({
			queryKey: ["ordem-servico-itens", id],
		});
		void queryClient.invalidateQueries({
			queryKey: ["ordem-servico-eventos", id],
		});
		void queryClient.invalidateQueries({
			queryKey: ["ordem-servico-faturamentos", id],
		});
		void queryClient.invalidateQueries({
			queryKey: ["ordem-servico-lotes", id],
		});
	}
	if (idempresa) {
		void queryClient.invalidateQueries({
			queryKey: ordemServicoQueryKeys.config(idempresa),
		});
		void queryClient.invalidateQueries({
			queryKey: ["tipos-ordem-servico-evento", idempresa],
		});
	}
}

export function useCriarOrdemServico() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (dados: CriarOrdemServicoData) =>
			ordemServicoService.criar(dados),
		onSuccess: () => {
			invalidarDominioOs(queryClient);
		},
	});
}

export function useAtualizarOrdemServico(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (dados: AtualizarOrdemServicoData) =>
			ordemServicoService.atualizar(id, dados),
		onSuccess: (_data, variables) => {
			invalidarDominioOs(queryClient, id, variables.idempresa);
		},
	});
}

export function useExcluirOrdemServico() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, idempresa }: { id: string; idempresa: string }) =>
			ordemServicoService.excluir(id, idempresa),
		onSuccess: () => {
			invalidarDominioOs(queryClient);
		},
	});
}

export function useSalvarItemOrdemServico(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			iditem,
			dados,
		}: {
			iditem?: string;
			dados: CriarItemOsData | AtualizarItemOsData;
		}) => {
			if (iditem) {
				return ordemServicoService.atualizarItem(
					id,
					iditem,
					dados as AtualizarItemOsData,
				);
			}
			return ordemServicoService.criarItem(id, dados as CriarItemOsData);
		},
		onSuccess: (_data, variables) => {
			invalidarDominioOs(queryClient, id, variables.dados.idempresa);
		},
	});
}

export function useExcluirItemOrdemServico(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			iditem,
			idempresa,
		}: {
			iditem: string;
			idempresa: string;
		}) => ordemServicoService.excluirItem(id, iditem, idempresa),
		onSuccess: (_data, variables) => {
			invalidarDominioOs(queryClient, id, variables.idempresa);
		},
	});
}

export function useSalvarLoteOrdemServico(id: string, iditem: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			idlote,
			dados,
		}: {
			idlote?: string;
			dados: CriarLoteOsData | AtualizarLoteOsData;
		}) => {
			if (idlote) {
				return ordemServicoService.atualizarLote(
					id,
					iditem,
					idlote,
					dados as AtualizarLoteOsData,
				);
			}
			return ordemServicoService.criarLote(
				id,
				iditem,
				dados as CriarLoteOsData,
			);
		},
		onSuccess: (_data, variables) => {
			invalidarDominioOs(queryClient, id, variables.dados.idempresa);
		},
	});
}

export function useExcluirLoteOrdemServico(id: string, iditem: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			idlote,
			idempresa,
		}: {
			idlote: string;
			idempresa: string;
		}) => ordemServicoService.excluirLote(id, iditem, idlote, idempresa),
		onSuccess: (_data, variables) => {
			invalidarDominioOs(queryClient, id, variables.idempresa);
		},
	});
}

export function useRegistrarEventoOrdemServico(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (dados: CriarEventoOsData) =>
			ordemServicoService.criarEvento(id, dados),
		onSuccess: (_data, variables) => {
			invalidarDominioOs(queryClient, id, variables.idempresa);
		},
	});
}

export function useGerarContasReceberOrdemServico(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (dados: GerarContasReceberOsData) =>
			ordemServicoService.gerarContasReceber(id, dados),
		onSuccess: (_data, variables) => {
			invalidarDominioOs(queryClient, id, variables.idempresa);
		},
	});
}

export function useGerarNfeRascunhoOrdemServico(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (dados: GerarNfeRascunhoOsData) =>
			ordemServicoService.gerarNfeRascunho(id, dados),
		onSuccess: (_data, variables) => {
			invalidarDominioOs(queryClient, id, variables.idempresa);
		},
	});
}

export function useAtualizarConfiguracaoOrdemServico() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			idempresa,
			dados,
		}: {
			idempresa: string;
			dados: Partial<ConfiguracaoOrdemServico> & {
				camposExtras?: CampoExtraOrdemServico[];
			};
		}) => ordemServicoService.atualizarConfiguracao(idempresa, dados),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: ordemServicoQueryKeys.config(variables.idempresa),
			});
		},
	});
}

export function useAtualizarTipoOrdemServicoEvento() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			dados,
		}: {
			id: string;
			dados: {
				idempresa: string;
				descricao?: string;
				cor?: string;
				ordem?: number;
				ativo?: number;
			};
		}) => ordemServicoService.atualizarTipoEvento(id, dados),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: ["tipos-ordem-servico-evento", variables.dados.idempresa],
			});
		},
	});
}

export function useInativarTipoOrdemServicoEvento() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, idempresa }: { id: string; idempresa: string }) =>
			ordemServicoService.inativarTipoEvento(id, idempresa),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: ["tipos-ordem-servico-evento", variables.idempresa],
			});
		},
	});
}

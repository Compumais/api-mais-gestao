"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDashboardFilters } from "@/hooks/dashboard/dashboard-filters-context";
import { useEmpresa } from "@/hooks/use-empresa";
import { periodoParaQuery } from "@/lib/dashboard-periodo";
import {
	type ComparativoFlexivelModo,
	dashboardService,
	type RankingOrdenacao,
	type TipoMetaDashboard,
} from "@/services/dashboard.service";

function usePeriodoQueryParams() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { periodoParams } = useDashboardFilters();
	const periodo = periodoParaQuery(periodoParams);

	return {
		empresaId: empresa?.id,
		params: {
			...(empresa?.id ? { idempresa: empresa.id } : {}),
			...periodo,
		},
		enabled: !!empresa?.id,
	};
}

export function useDashboardExecutivo() {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "executivo", empresaId, params],
		queryFn: () => dashboardService.buscarExecutivo(params),
		enabled,
	});
}

export function useDashboardVendasAvancadas() {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "vendas-avancadas", empresaId, params],
		queryFn: () => dashboardService.buscarVendasAvancadas(params),
		enabled,
	});
}

export function useDashboardVendasPorHora() {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "vendas-por-hora", empresaId, params],
		queryFn: () => dashboardService.buscarVendasPorHora(params),
		enabled,
	});
}

export function useDashboardVendasPorDiaSemana() {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "vendas-por-dia-semana", empresaId, params],
		queryFn: () => dashboardService.buscarVendasPorDiaSemana(params),
		enabled,
	});
}

export function useDashboardTopProdutosAvancado(ordenacao: RankingOrdenacao) {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "top-produtos-avancado", empresaId, params, ordenacao],
		queryFn: () =>
			dashboardService.buscarTopProdutosAvancado({ ...params, ordenacao, limit: 10 }),
		enabled,
	});
}

export function useDashboardMatrizProdutos() {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "matriz-produtos", empresaId, params],
		queryFn: () => dashboardService.buscarMatrizProdutos(params),
		enabled,
	});
}

export function useDashboardFinanceiroSaude() {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "financeiro-saude", empresaId, params],
		queryFn: () => dashboardService.buscarFinanceiroSaude(params),
		enabled,
	});
}

export function useDashboardFluxoCaixa(
	modo: "historico" | "projetado",
	horizonte = 30,
) {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "fluxo-caixa", empresaId, params, modo, horizonte],
		queryFn: () =>
			dashboardService.buscarFluxoCaixa({
				...params,
				modo,
				horizonteDias: horizonte,
			}),
		enabled,
	});
}

export function useDashboardDreAvancado(
	granularidade: "ano" | "trimestre" | "mes",
	opts?: { ano?: number; mes?: number; trimestre?: number },
) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const ano = opts?.ano ?? new Date().getFullYear();
	return useQuery({
		queryKey: [
			"dashboard",
			"dre-avancado",
			empresa?.id,
			granularidade,
			ano,
			opts?.mes,
			opts?.trimestre,
		],
		queryFn: () =>
			dashboardService.buscarDreAvancado({
				idempresa: empresa?.id,
				granularidade,
				ano,
				...(opts?.mes !== undefined ? { mes: opts.mes } : {}),
				...(opts?.trimestre !== undefined ? { trimestre: opts.trimestre } : {}),
			}),
		enabled: !!empresa?.id,
	});
}

export function useDashboardComparativoFlexivel(modo: ComparativoFlexivelModo) {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "comparativo-flexivel", empresaId, params, modo],
		queryFn: () =>
			dashboardService.buscarComparativoFlexivel({ ...params, modo }),
		enabled,
	});
}

export function useDashboardRentabilidade(dimensao: "produto" | "categoria") {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "rentabilidade", empresaId, params, dimensao],
		queryFn: () =>
			dashboardService.buscarRentabilidade({ ...params, dimensao }),
		enabled,
	});
}

export function useDashboardClientes() {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "clientes", empresaId, params],
		queryFn: () => dashboardService.buscarClientesAnalytics(params),
		enabled,
	});
}

export function useDashboardClientesRfm() {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "clientes-rfm", empresaId, params],
		queryFn: () => dashboardService.buscarClientesRfm(params),
		enabled,
	});
}

export function useDashboardInsights(opts?: { enabled?: boolean }) {
	const { empresaId, params, enabled } = usePeriodoQueryParams();
	return useQuery({
		queryKey: ["dashboard", "insights", empresaId, params],
		queryFn: () => dashboardService.buscarInsights(params),
		enabled: enabled && (opts?.enabled ?? true),
	});
}

export function useDashboardMetasAcompanhamento() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	return useQuery({
		queryKey: ["dashboard", "metas-acompanhamento", empresa?.id],
		queryFn: () =>
			dashboardService.buscarMetasAcompanhamento({
				idempresa: empresa?.id,
			}),
		enabled: !!empresa?.id,
	});
}

export function useCriarMetaDashboard() {
	const qc = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	return useMutation({
		mutationFn: (body: {
			tipo: TipoMetaDashboard;
			periodoInicio: string;
			periodoFim: string;
			valorMeta: string | number;
		}) =>
			dashboardService.criarMeta({
				idempresa: empresa!.id,
				...body,
			}),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: ["dashboard", "metas"] });
			void qc.invalidateQueries({
				queryKey: ["dashboard", "metas-acompanhamento"],
			});
		},
	});
}

export function useExcluirMetaDashboard() {
	const qc = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();

	return useMutation({
		mutationFn: (id: string) =>
			dashboardService.excluirMeta(id, { idempresa: empresa?.id }),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: ["dashboard", "metas"] });
			void qc.invalidateQueries({
				queryKey: ["dashboard", "metas-acompanhamento"],
			});
		},
	});
}

export function useDashboardControle(ano: number) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	return useQuery({
		queryKey: ["dashboard", "controle-plano-contas", empresa?.id, ano],
		queryFn: () =>
			dashboardService.buscarControlePlanoContas({
				idempresa: empresa?.id,
				ano,
			}),
		enabled: !!empresa?.id,
	});
}

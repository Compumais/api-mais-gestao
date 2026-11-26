"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/provider/empresa-provider";
import {
	type BiColSpan,
	type BiMapeamentoGrafico,
	type BiTipoGrafico,
	editorSqlService,
} from "@/services/editor-sql.service";

export function useBiSchema(enabled = true) {
	const { empresa } = useEmpresa();
	return useQuery({
		queryKey: ["bi-schema", empresa?.id],
		queryFn: () => editorSqlService.obterSchema(),
		enabled: Boolean(empresa?.id) && enabled,
		staleTime: 1000 * 60 * 10,
	});
}

export function useBiCatalogo(enabled = true) {
	const { empresa } = useEmpresa();
	return useQuery({
		queryKey: ["bi-catalogo", empresa?.id],
		queryFn: () => editorSqlService.listarCatalogo(),
		enabled: Boolean(empresa?.id) && enabled,
		staleTime: 1000 * 60 * 30,
	});
}

export function useBiConsultas(enabled = true) {
	const { empresa } = useEmpresa();
	return useQuery({
		queryKey: ["bi-consultas", empresa?.id],
		queryFn: () => editorSqlService.listarConsultas(),
		enabled: Boolean(empresa?.id) && enabled,
	});
}

export function useBiDashboardLayout() {
	const { empresa } = useEmpresa();
	return useQuery({
		queryKey: ["bi-dashboard-layout", empresa?.id],
		queryFn: () => editorSqlService.obterDashboardLayout(),
		enabled: Boolean(empresa?.id),
	});
}

export function useBiWidgetDados(
	widgetId: string,
	parametros: Record<string, unknown>,
) {
	const { empresa } = useEmpresa();
	return useQuery({
		queryKey: ["bi-widget-dados", empresa?.id, widgetId, parametros],
		queryFn: () =>
			editorSqlService.executarWidget(widgetId, {
				parametros,
				forcarAtualizacao: false,
			}),
		enabled: Boolean(empresa?.id) && Boolean(widgetId),
		staleTime: 1000 * 60 * 5,
		retry: false,
	});
}

export function useBiMutations() {
	const queryClient = useQueryClient();
	const { empresa } = useEmpresa();

	const invalidarTudo = () => {
		queryClient.invalidateQueries({
			queryKey: ["bi-consultas", empresa?.id],
		});
		queryClient.invalidateQueries({
			queryKey: ["bi-dashboard-layout", empresa?.id],
		});
	};

	const executarSql = useMutation({
		mutationFn: (payload: {
			sql: string;
			parametros?: Record<string, unknown>;
			limiteLinhas?: number;
		}) => editorSqlService.executarSql(payload),
	});

	const criarConsulta = useMutation({
		mutationFn: (payload: {
			nome: string;
			descricao?: string | null;
			sql: string;
		}) => editorSqlService.criarConsulta(payload),
		onSuccess: invalidarTudo,
	});

	const atualizarConsulta = useMutation({
		mutationFn: ({
			id,
			...payload
		}: {
			id: string;
			nome?: string;
			descricao?: string | null;
			sql?: string;
		}) => editorSqlService.atualizarConsulta(id, payload),
		onSuccess: () => {
			invalidarTudo();
			queryClient.invalidateQueries({
				queryKey: ["bi-widget-dados", empresa?.id],
			});
		},
	});

	const excluirConsulta = useMutation({
		mutationFn: (id: string) => editorSqlService.excluirConsulta(id),
		onSuccess: invalidarTudo,
	});

	const criarWidget = useMutation({
		mutationFn: (payload: {
			idconsulta?: string;
			sql?: string;
			nomeConsulta?: string;
			titulo: string;
			subtitulo?: string | null;
			tipografico: BiTipoGrafico;
			mapeamento: BiMapeamentoGrafico;
			cachettlsegundos?: number;
			adicionarAoDashboard?: boolean;
			colSpan?: BiColSpan;
		}) => editorSqlService.criarWidget(payload),
		onSuccess: invalidarTudo,
	});

	const instalarDoCatalogo = useMutation({
		mutationFn: (codigo: string) => editorSqlService.instalarDoCatalogo(codigo),
		onSuccess: invalidarTudo,
	});

	const excluirWidget = useMutation({
		mutationFn: (id: string) => editorSqlService.excluirWidget(id),
		onSuccess: invalidarTudo,
	});

	const salvarLayout = useMutation({
		mutationFn: (payload: {
			nome?: string;
			itens: Array<{ widgetId: string; ordem: number; colSpan: BiColSpan }>;
		}) => editorSqlService.salvarDashboardLayout(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["bi-dashboard-layout", empresa?.id],
			});
		},
	});

	return {
		executarSql,
		criarConsulta,
		atualizarConsulta,
		excluirConsulta,
		criarWidget,
		instalarDoCatalogo,
		excluirWidget,
		salvarLayout,
	};
}

"use client";

import * as React from "react";
import { Suspense } from "react";
import { DashboardFiltersBar } from "@/components/dashboard/dashboard-filters-bar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	DashboardFiltersProvider,
	useDashboardFilters,
} from "@/hooks/dashboard/dashboard-filters-context";
import { useDashboardFiltroOpcoes } from "@/hooks/dashboard/use-dashboard-filtro-opcoes";
import { useEntitlements } from "@/hooks/use-plano";
import {
	DASHBOARD_TAB_LABELS,
	DASHBOARD_TABS_BASICAS,
	DASHBOARD_TABS_COMPLETAS,
	type DashboardTab,
} from "@/lib/dashboard-periodo";
import { BlocoErrorBoundary } from "@/components/bloco-error-boundary";
import { PageContainer } from "../components/page-container";
import { AlertasSection } from "./components/alertas-section";
import { ClientesSection } from "./components/clientes-section";
import { ComparativoSection } from "./components/comparativo-section";
import { ControleSection } from "./components/controle-section";
import { DreSection } from "./components/dre-section";
import { FinanceiroSection } from "./components/financeiro-section";
import { FluxoCaixaSection } from "./components/fluxo-caixa-section";
import { MetasSection } from "./components/metas-section";
import { RentabilidadeSection } from "./components/rentabilidade-section";
import { VendasSection } from "./components/vendas-section";
import { VisaoGeralSection } from "./components/visao-geral-section";

const FEATURE_DASHBOARD_COMPLETO = "dashboard_completo";

function DashboardShell() {
	const { tab, setTab } = useDashboardFilters();
	const { vendedores, categorias, carregandoOpcoes } =
		useDashboardFiltroOpcoes();
	const { hasFeature, isLoading: loadingPlano } = useEntitlements();
	const temCompleto = hasFeature(FEATURE_DASHBOARD_COMPLETO);

	const tabsVisiveis = React.useMemo(() => {
		const ordem: DashboardTab[] = [
			"visao-geral",
			"vendas",
			"clientes",
			"financeiro",
			"fluxo-caixa",
			"rentabilidade",
			"dre",
			"metas",
			"comparativo",
			"alertas",
			"controle",
		];
		return ordem.filter((t) => {
			if (DASHBOARD_TABS_BASICAS.includes(t)) return true;
			if (DASHBOARD_TABS_COMPLETAS.includes(t)) {
				return temCompleto || loadingPlano;
			}
			return true;
		});
	}, [temCompleto, loadingPlano]);

	React.useEffect(() => {
		if (
			!loadingPlano &&
			!temCompleto &&
			DASHBOARD_TABS_COMPLETAS.includes(tab)
		) {
			setTab("visao-geral");
		}
	}, [loadingPlano, temCompleto, tab, setTab]);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4 lg:px-6">
					<div className="mb-4">
						<h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
						<p className="text-sm text-muted-foreground">
							Gestão e tomada de decisão — visão executiva com drill-down por
							área
						</p>
					</div>

					<DashboardFiltersBar
						vendedores={vendedores}
						categorias={categorias}
						carregandoOpcoes={carregandoOpcoes}
					/>

					<ToggleGroup
						type="single"
						value={tab}
						onValueChange={(value) => {
							if (value) setTab(value as DashboardTab);
						}}
						variant="outline"
						className="mt-4 flex flex-wrap justify-start gap-1"
					>
						{tabsVisiveis.map((t) => (
							<ToggleGroupItem key={t} value={t}>
								{DASHBOARD_TAB_LABELS[t]}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</div>

				{tab === "visao-geral" && (
					<BlocoErrorBoundary titulo="Erro na visão geral" variante="compacto">
						<VisaoGeralSection />
					</BlocoErrorBoundary>
				)}
				{tab === "vendas" && (
					<BlocoErrorBoundary titulo="Erro na seção de vendas" variante="compacto">
						<VendasSection />
					</BlocoErrorBoundary>
				)}
				{tab === "clientes" && (
					<BlocoErrorBoundary
						titulo="Erro na seção de clientes"
						variante="compacto"
					>
						<ClientesSection />
					</BlocoErrorBoundary>
				)}
				{tab === "financeiro" && (
					<BlocoErrorBoundary
						titulo="Erro na seção financeira"
						variante="compacto"
					>
						<FinanceiroSection />
					</BlocoErrorBoundary>
				)}
				{tab === "fluxo-caixa" && (
					<BlocoErrorBoundary titulo="Erro no fluxo de caixa" variante="compacto">
						<FluxoCaixaSection />
					</BlocoErrorBoundary>
				)}
				{tab === "rentabilidade" && (
					<BlocoErrorBoundary
						titulo="Erro na seção de rentabilidade"
						variante="compacto"
					>
						<RentabilidadeSection />
					</BlocoErrorBoundary>
				)}
				{tab === "dre" && (
					<BlocoErrorBoundary titulo="Erro na seção de DRE" variante="compacto">
						<DreSection />
					</BlocoErrorBoundary>
				)}
				{tab === "metas" && (
					<BlocoErrorBoundary titulo="Erro na seção de metas" variante="compacto">
						<MetasSection />
					</BlocoErrorBoundary>
				)}
				{tab === "comparativo" && (
					<BlocoErrorBoundary
						titulo="Erro na seção comparativa"
						variante="compacto"
					>
						<ComparativoSection />
					</BlocoErrorBoundary>
				)}
				{tab === "alertas" && (
					<BlocoErrorBoundary titulo="Erro na seção de alertas" variante="compacto">
						<AlertasSection />
					</BlocoErrorBoundary>
				)}
				{tab === "controle" && (
					<BlocoErrorBoundary
						titulo="Erro na seção de controle"
						variante="compacto"
					>
						<ControleSection />
					</BlocoErrorBoundary>
				)}
			</div>
		</PageContainer>
	);
}

export default function Page() {
	return (
		<Suspense
			fallback={
				<PageContainer>
					<div className="px-4 py-6 text-sm text-muted-foreground lg:px-6">
						Carregando dashboard…
					</div>
				</PageContainer>
			}
		>
			<DashboardFiltersProvider>
				<DashboardShell />
			</DashboardFiltersProvider>
		</Suspense>
	);
}

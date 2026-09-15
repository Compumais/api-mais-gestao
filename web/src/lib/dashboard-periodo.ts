import {
	adicionarDiasIso,
	formatDateOnlyDisplay,
	hojeBrasiliaIsoDate,
	inicioFimMesBrasilia,
	inicioFimMesDe,
} from "@/lib/date";

export type PeriodoPreset =
	| "hoje"
	| "ontem"
	| "7d"
	| "30d"
	| "mes_atual"
	| "mes_anterior"
	| "ano_atual"
	| "personalizado";

export type DashboardTab =
	| "visao-geral"
	| "vendas"
	| "clientes"
	| "financeiro"
	| "fluxo-caixa"
	| "rentabilidade"
	| "dre"
	| "metas"
	| "comparativo"
	| "alertas"
	| "controle";

export const DASHBOARD_TABS_BASICAS: DashboardTab[] = [
	"visao-geral",
	"vendas",
	"financeiro",
	"dre",
	"comparativo",
	"controle",
];

export const DASHBOARD_TABS_COMPLETAS: DashboardTab[] = [
	"clientes",
	"fluxo-caixa",
	"rentabilidade",
	"metas",
	"alertas",
];

export const DASHBOARD_TAB_LABELS: Record<DashboardTab, string> = {
	"visao-geral": "Visão Geral",
	vendas: "Vendas",
	clientes: "Clientes",
	financeiro: "Financeiro",
	"fluxo-caixa": "Fluxo de Caixa",
	rentabilidade: "Rentabilidade",
	dre: "DRE",
	metas: "Metas",
	comparativo: "Comparativos",
	alertas: "Alertas",
	controle: "Controle",
};

export const PERIODO_PRESET_LABELS: Record<PeriodoPreset, string> = {
	hoje: "Hoje",
	ontem: "Ontem",
	"7d": "Últimos 7 dias",
	"30d": "Últimos 30 dias",
	mes_atual: "Mês atual",
	mes_anterior: "Mês anterior",
	ano_atual: "Ano atual",
	personalizado: "Personalizado",
};

export type DashboardPeriodoParams = {
	preset: PeriodoPreset;
	dataInicio?: string;
	dataFim?: string;
};

export function isDashboardTab(value: string | null): value is DashboardTab {
	if (!value) return false;
	return value in DASHBOARD_TAB_LABELS;
}

export function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1) {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return "—";
	}
	const sinal = value > 0 ? "+" : "";
	return `${sinal}${value.toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 0) {
	return new Intl.NumberFormat("pt-BR", {
		maximumFractionDigits: digits,
		minimumFractionDigits: digits,
	}).format(value);
}

export function periodoParaQuery(params: DashboardPeriodoParams) {
	const query: {
		preset: PeriodoPreset;
		dataInicio?: string;
		dataFim?: string;
	} = { preset: params.preset };

	if (params.preset === "personalizado") {
		if (params.dataInicio) query.dataInicio = params.dataInicio;
		if (params.dataFim) query.dataFim = params.dataFim;
	}

	return query;
}

export function intervaloExibido(params: DashboardPeriodoParams) {
	const hoje = hojeBrasiliaIsoDate();
	switch (params.preset) {
		case "hoje":
			return formatDateOnlyDisplay(hoje);
		case "ontem":
			return formatDateOnlyDisplay(adicionarDiasIso(hoje, -1));
		case "7d":
			return `${formatDateOnlyDisplay(adicionarDiasIso(hoje, -6))} – ${formatDateOnlyDisplay(hoje)}`;
		case "30d":
			return `${formatDateOnlyDisplay(adicionarDiasIso(hoje, -29))} – ${formatDateOnlyDisplay(hoje)}`;
		case "mes_atual": {
			const mes = inicioFimMesBrasilia();
			return `${formatDateOnlyDisplay(mes.inicio)} – ${formatDateOnlyDisplay(hoje)}`;
		}
		case "mes_anterior": {
			const mesAnt = inicioFimMesDe(adicionarDiasIso(`${hoje.slice(0, 7)}-01`, -1));
			return `${formatDateOnlyDisplay(mesAnt.inicio)} – ${formatDateOnlyDisplay(mesAnt.fim)}`;
		}
		case "ano_atual":
			return `${formatDateOnlyDisplay(`${hoje.slice(0, 4)}-01-01`)} – ${formatDateOnlyDisplay(hoje)}`;
		case "personalizado":
			if (params.dataInicio && params.dataFim) {
				return `${formatDateOnlyDisplay(params.dataInicio)} – ${formatDateOnlyDisplay(params.dataFim)}`;
			}
			return "Período personalizado";
		default:
			return "";
	}
}

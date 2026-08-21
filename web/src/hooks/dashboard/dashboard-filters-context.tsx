"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
	type DashboardPeriodoParams,
	type DashboardTab,
	type PeriodoPreset,
	isDashboardTab,
} from "@/lib/dashboard-periodo";

type DashboardFiltersContextValue = {
	tab: DashboardTab;
	setTab: (tab: DashboardTab) => void;
	preset: PeriodoPreset;
	setPreset: (preset: PeriodoPreset) => void;
	dataInicio: string;
	dataFim: string;
	setIntervaloPersonalizado: (inicio: string, fim: string) => void;
	periodoParams: DashboardPeriodoParams;
	idvendedor?: string;
	idcategoria?: string;
	setFiltroAvancado: (
		key: "idvendedor" | "idcategoria",
		value: string | undefined,
	) => void;
};

const DashboardFiltersContext =
	React.createContext<DashboardFiltersContextValue | null>(null);

function readTab(searchParams: URLSearchParams): DashboardTab {
	const raw = searchParams.get("tab");
	return isDashboardTab(raw) ? raw : "visao-geral";
}

function readPreset(searchParams: URLSearchParams): PeriodoPreset {
	const raw = searchParams.get("preset");
	const valid: PeriodoPreset[] = [
		"hoje",
		"ontem",
		"7d",
		"30d",
		"mes_atual",
		"mes_anterior",
		"ano_atual",
		"personalizado",
	];
	if (raw && valid.includes(raw as PeriodoPreset)) {
		return raw as PeriodoPreset;
	}
	return "30d";
}

export function DashboardFiltersProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const tab = readTab(searchParams);
	const preset = readPreset(searchParams);
	const dataInicio = searchParams.get("dataInicio") ?? "";
	const dataFim = searchParams.get("dataFim") ?? "";
	const idvendedor = searchParams.get("idvendedor") ?? undefined;
	const idcategoria = searchParams.get("idcategoria") ?? undefined;

	const replaceParams = React.useCallback(
		(mutate: (params: URLSearchParams) => void) => {
			const params = new URLSearchParams(searchParams.toString());
			mutate(params);
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	const setTab = React.useCallback(
		(next: DashboardTab) => {
			replaceParams((params) => {
				params.set("tab", next);
			});
		},
		[replaceParams],
	);

	const setPreset = React.useCallback(
		(next: PeriodoPreset) => {
			replaceParams((params) => {
				params.set("preset", next);
				if (next !== "personalizado") {
					params.delete("dataInicio");
					params.delete("dataFim");
				}
			});
		},
		[replaceParams],
	);

	const setIntervaloPersonalizado = React.useCallback(
		(inicio: string, fim: string) => {
			replaceParams((params) => {
				params.set("preset", "personalizado");
				params.set("dataInicio", inicio);
				params.set("dataFim", fim);
			});
		},
		[replaceParams],
	);

	const setFiltroAvancado = React.useCallback(
		(key: "idvendedor" | "idcategoria", value: string | undefined) => {
			replaceParams((params) => {
				if (value) params.set(key, value);
				else params.delete(key);
			});
		},
		[replaceParams],
	);

	const periodoParams: DashboardPeriodoParams = React.useMemo(
		() => ({
			preset,
			...(dataInicio ? { dataInicio } : {}),
			...(dataFim ? { dataFim } : {}),
		}),
		[preset, dataInicio, dataFim],
	);

	const value: DashboardFiltersContextValue = {
		tab,
		setTab,
		preset,
		setPreset,
		dataInicio,
		dataFim,
		setIntervaloPersonalizado,
		periodoParams,
		...(idvendedor ? { idvendedor } : {}),
		...(idcategoria ? { idcategoria } : {}),
		setFiltroAvancado,
	};

	return (
		<DashboardFiltersContext.Provider value={value}>
			{children}
		</DashboardFiltersContext.Provider>
	);
}

export function useDashboardFilters() {
	const ctx = React.useContext(DashboardFiltersContext);
	if (!ctx) {
		throw new Error(
			"useDashboardFilters deve ser usado dentro de DashboardFiltersProvider",
		);
	}
	return ctx;
}

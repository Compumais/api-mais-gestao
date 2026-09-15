"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useDashboardFilters } from "@/hooks/dashboard/dashboard-filters-context";
import { useDashboardInsights } from "@/hooks/dashboard/use-dashboard-queries";
import type { DashboardTab } from "@/lib/dashboard-periodo";
import { cn } from "@/lib/utils";

const SEVERIDADE = {
	positivo: {
		label: "Positivo",
		className: "border-emerald-200 bg-emerald-50 text-emerald-900",
	},
	atencao: {
		label: "Atenção",
		className: "border-amber-200 bg-amber-50 text-amber-900",
	},
	critico: {
		label: "Crítico",
		className: "border-red-200 bg-red-50 text-red-900",
	},
} as const;

export function AlertasSection() {
	const { setTab } = useDashboardFilters();
	const { data, isLoading } = useDashboardInsights();

	if (isLoading) {
		return (
			<div className="px-4 text-sm text-muted-foreground lg:px-6">
				Carregando alertas…
			</div>
		);
	}

	const grupos = {
		positivo: (data ?? []).filter((i) => i.severidade === "positivo"),
		atencao: (data ?? []).filter((i) => i.severidade === "atencao"),
		critico: (data ?? []).filter((i) => i.severidade === "critico"),
	};

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			{(Object.keys(grupos) as Array<keyof typeof grupos>).map((sev) => (
				<Card key={sev}>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							{SEVERIDADE[sev].label}
							<Badge variant="secondary">{grupos[sev].length}</Badge>
						</CardTitle>
						<CardDescription>
							Insights automáticos para tomada de decisão
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{grupos[sev].length === 0 && (
							<p className="text-sm text-muted-foreground">
								Nenhum item nesta categoria.
							</p>
						)}
						{grupos[sev].map((insight) => (
							<button
								key={insight.codigo}
								type="button"
								onClick={() => setTab(insight.tabAlvo as DashboardTab)}
								className={cn(
									"w-full rounded-md border px-3 py-3 text-left text-sm transition-colors hover:opacity-90",
									SEVERIDADE[sev].className,
								)}
							>
								{insight.mensagem}
								<span className="mt-1 block text-xs opacity-70">
									Abrir: {insight.tabAlvo}
								</span>
							</button>
						))}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

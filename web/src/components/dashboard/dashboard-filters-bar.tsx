"use client";

import { useDashboardFilters } from "@/hooks/dashboard/dashboard-filters-context";
import {
	intervaloExibido,
	PERIODO_PRESET_LABELS,
	type PeriodoPreset,
} from "@/lib/dashboard-periodo";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const PRESETS: PeriodoPreset[] = [
	"hoje",
	"ontem",
	"7d",
	"30d",
	"mes_atual",
	"mes_anterior",
	"ano_atual",
	"personalizado",
];

export function DashboardFiltersBar() {
	const {
		preset,
		setPreset,
		dataInicio,
		dataFim,
		setIntervaloPersonalizado,
		periodoParams,
		idvendedor,
		idcategoria,
		setFiltroAvancado,
	} = useDashboardFilters();

	return (
		<div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-1">
					<span className="text-sm font-medium">Período</span>
					<span className="text-xs text-muted-foreground">
						{intervaloExibido(periodoParams)}
					</span>
				</div>
				<Select
					value={preset}
					onValueChange={(value) => setPreset(value as PeriodoPreset)}
				>
					<SelectTrigger className="w-full sm:w-[220px]" size="sm">
						<SelectValue placeholder="Período" />
					</SelectTrigger>
					<SelectContent>
						{PRESETS.map((item) => (
							<SelectItem key={item} value={item}>
								{PERIODO_PRESET_LABELS[item]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{preset === "personalizado" && (
				<div className="flex flex-col gap-2 sm:flex-row">
					<label className="flex flex-1 flex-col gap-1 text-xs">
						<span className="text-muted-foreground">Data início</span>
						<Input
							type="date"
							value={dataInicio}
							onChange={(e) =>
								setIntervaloPersonalizado(e.target.value, dataFim || e.target.value)
							}
						/>
					</label>
					<label className="flex flex-1 flex-col gap-1 text-xs">
						<span className="text-muted-foreground">Data fim</span>
						<Input
							type="date"
							value={dataFim}
							onChange={(e) =>
								setIntervaloPersonalizado(
									dataInicio || e.target.value,
									e.target.value,
								)
							}
						/>
					</label>
				</div>
			)}

			<div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
				<label className="flex flex-col gap-1 text-xs">
					<span className="text-muted-foreground">
						Vendedor (ID — filtro avançado)
					</span>
					<Input
						placeholder="UUID do vendedor"
						value={idvendedor ?? ""}
						onChange={(e) =>
							setFiltroAvancado(
								"idvendedor",
								e.target.value.trim() || undefined,
							)
						}
					/>
				</label>
				<label className="flex flex-col gap-1 text-xs">
					<span className="text-muted-foreground">
						Categoria (ID — filtro avançado)
					</span>
					<Input
						placeholder="UUID da categoria"
						value={idcategoria ?? ""}
						onChange={(e) =>
							setFiltroAvancado(
								"idcategoria",
								e.target.value.trim() || undefined,
							)
						}
					/>
				</label>
			</div>
		</div>
	);
}

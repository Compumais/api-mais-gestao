"use client";

import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDashboardFilters } from "@/hooks/dashboard/dashboard-filters-context";
import type { OpcaoFiltroDashboard } from "@/hooks/dashboard/use-dashboard-filtro-opcoes";
import {
	intervaloExibido,
	PERIODO_PRESET_LABELS,
	type PeriodoPreset,
} from "@/lib/dashboard-periodo";

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

const FILTRO_TODOS = "todos";

type DashboardFiltersBarProps = {
	vendedores: OpcaoFiltroDashboard[];
	categorias: OpcaoFiltroDashboard[];
	carregandoOpcoes?: boolean;
};

function SelectFiltroAvancado({
	id,
	label,
	value,
	opcoes,
	carregando,
	onChange,
}: {
	id: string;
	label: string;
	value: string | undefined;
	opcoes: OpcaoFiltroDashboard[];
	carregando: boolean;
	onChange: (value: string | undefined) => void;
}) {
	return (
		<label className="flex flex-col gap-1 text-xs" htmlFor={id}>
			<span className="text-muted-foreground">{label}</span>
			<Select
				value={value ?? FILTRO_TODOS}
				onValueChange={(next) =>
					onChange(next === FILTRO_TODOS ? undefined : next)
				}
				disabled={carregando}
			>
				<SelectTrigger className="w-full" id={id} size="sm">
					<SelectValue placeholder={carregando ? "Carregando..." : "Todos"} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={FILTRO_TODOS}>Todos</SelectItem>
					{value && !opcoes.some((opcao) => opcao.id === value) && (
						<SelectItem value={value}>Selecionado</SelectItem>
					)}
					{opcoes.map((opcao) => (
						<SelectItem key={opcao.id} value={opcao.id}>
							{opcao.nome}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</label>
	);
}

export function DashboardFiltersBar({
	vendedores,
	categorias,
	carregandoOpcoes = false,
}: DashboardFiltersBarProps) {
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
					<label
						className="flex flex-1 flex-col gap-1 text-xs"
						htmlFor="filtro-data-inicio"
					>
						<span className="text-muted-foreground">Data início</span>
						<Input
							id="filtro-data-inicio"
							type="date"
							value={dataInicio}
							onChange={(e) =>
								setIntervaloPersonalizado(
									e.target.value,
									dataFim || e.target.value,
								)
							}
						/>
					</label>
					<label
						className="flex flex-1 flex-col gap-1 text-xs"
						htmlFor="filtro-data-fim"
					>
						<span className="text-muted-foreground">Data fim</span>
						<Input
							id="filtro-data-fim"
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
				<SelectFiltroAvancado
					id="filtro-vendedor"
					label="Vendedor"
					value={idvendedor}
					opcoes={vendedores}
					carregando={carregandoOpcoes}
					onChange={(value) => setFiltroAvancado("idvendedor", value)}
				/>
				<SelectFiltroAvancado
					id="filtro-categoria"
					label="Categoria"
					value={idcategoria}
					opcoes={categorias}
					carregando={carregandoOpcoes}
					onChange={(value) => setFiltroAvancado("idcategoria", value)}
				/>
			</div>
		</div>
	);
}

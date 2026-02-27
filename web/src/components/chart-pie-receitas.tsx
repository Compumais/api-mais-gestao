"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEmpresa } from "@/hooks/use-empresa";
import { useIsMobile } from "@/hooks/use-mobile";
import { dashboardService } from "@/services/dashboard.service";

const RECEITAS_COLORS = [
	"#16a34a", // green-600
	"#15803d", // green-700
	"#166534", // green-800
	"#14532d", // green-900
	"#052e16", // green-950
];

const chartConfig = {
	value: {
		label: "Total",
		color: "#16a34a",
	},
} satisfies ChartConfig;

export function ChartPieReceitas() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const isMobile = useIsMobile();
	const [timeRange, setTimeRange] = React.useState("90d");

	React.useEffect(() => {
		if (isMobile) {
			setTimeRange("7d");
		}
	}, [isMobile]);

	const dias = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

	const getDescription = () => {
		if (timeRange === "7d") return "Últimos 7 dias";
		if (timeRange === "30d") return "Últimos 30 dias";
		return "Últimos 3 meses";
	};

	const {
		data,
		isLoading,
		isError,
		error,
	} = useQuery({
		queryKey: ["dashboard", "top-receitas-categoria", empresa?.id, dias],
		queryFn: () =>
			dashboardService.buscarTopReceitasPorCategoria({
				idempresa: empresa?.id,
				dias,
			}),
		enabled: !!empresa?.id,
	});

	const chartData =
		data?.itens.map((item, index) => ({
			id: item.idplanocontas,
			name: item.nome || "Sem nome",
			value: item.total,
			fill: RECEITAS_COLORS[index % RECEITAS_COLORS.length],
		})) ?? [];

	if (isLoading) {
		return (
			<Card className="@container/card">
				<CardHeader>
					<CardTitle>Top 5 Receitas por Categoria</CardTitle>
					<CardDescription>{getDescription()}</CardDescription>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<div className="aspect-auto h-[250px] w-full flex items-center justify-center">
						<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isError) {
		return (
			<Card className="@container/card">
				<CardHeader>
					<CardTitle>Top 5 Receitas por Categoria</CardTitle>
					<CardDescription>{getDescription()}</CardDescription>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<div className="aspect-auto h-[250px] w-full flex items-center justify-center">
						<div className="text-center">
							<p className="text-destructive mb-2">
								Erro ao carregar dados do gráfico
							</p>
							<p className="text-sm text-muted-foreground">
								{error instanceof Error ? error.message : "Erro desconhecido"}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!chartData.length) {
		return (
			<Card className="@container/card">
				<CardHeader>
					<CardTitle>Top 5 Receitas por Categoria</CardTitle>
					<CardDescription>{getDescription()}</CardDescription>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<div className="aspect-auto h-[250px] w-full flex items-center justify-center">
						<div className="text-center">
							<p className="text-muted-foreground">
								Nenhuma receita por categoria no período
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	const totalFormatado = new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(data?.total ?? 0);

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Top 5 Receitas por Categoria</CardTitle>
				<CardDescription>
					{getDescription()} — Total: {totalFormatado}
				</CardDescription>
				<CardAction>
					<ToggleGroup
						type="single"
						value={timeRange}
						onValueChange={setTimeRange}
						variant="outline"
						className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
					>
						<ToggleGroupItem value="90d">Últimos 3 meses</ToggleGroupItem>
						<ToggleGroupItem value="30d">Últimos 30 dias</ToggleGroupItem>
						<ToggleGroupItem value="7d">Últimos 7 dias</ToggleGroupItem>
					</ToggleGroup>
					<Select value={timeRange} onValueChange={setTimeRange}>
						<SelectTrigger
							className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
							size="sm"
							aria-label="Selecione um período"
						>
							<SelectValue placeholder="Últimos 3 meses" />
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							<SelectItem value="90d" className="rounded-lg">
								Últimos 3 meses
							</SelectItem>
							<SelectItem value="30d" className="rounded-lg">
								Últimos 30 dias
							</SelectItem>
							<SelectItem value="7d" className="rounded-lg">
								Últimos 7 dias
							</SelectItem>
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
					<PieChart>
						<Pie
							data={chartData}
							dataKey="value"
							nameKey="name"
							cx="50%"
							cy="50%"
							innerRadius={50}
							outerRadius={80}
							paddingAngle={2}
						>
							{chartData.map((entry) => (
								<Cell key={`cell-${entry.id}`} fill={entry.fill} />
							))}
						</Pie>
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(value) =>
										new Intl.NumberFormat("pt-BR", {
											style: "currency",
											currency: "BRL",
										}).format(Number(value))
									}
								/>
							}
						/>
					</PieChart>
				</ChartContainer>
				<ul className="mt-4 space-y-2 text-sm">
					{data?.itens.map((item, index) => (
						<li
							key={item.idplanocontas}
							className="flex items-center justify-between gap-2"
						>
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-sm"
								style={{
									backgroundColor:
										RECEITAS_COLORS[index % RECEITAS_COLORS.length],
								}}
							/>
							<span className="truncate text-muted-foreground">
								{item.nome || "Sem nome"}
							</span>
							<span className="shrink-0 font-medium tabular-nums">
								{new Intl.NumberFormat("pt-BR", {
									style: "currency",
									currency: "BRL",
								}).format(item.total)}
							</span>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}

"use client";

import { IconLock } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
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
import { usePlano } from "@/hooks/use-plano";
import { getMeuPlano } from "@/services/assinaturas.service";
import { dashboardService } from "@/services/dashboard.service";

export const description = "Gráfico de contas a pagar e receber";

const chartConfig = {
	contasReceber: {
		label: "Contas a Receber",
		color: "#16a34a",
	},
	contasPagar: {
		label: "Contas a Pagar",
		color: "#ef4444",
	},
} satisfies ChartConfig;

export function ChartAreaInteractive() {
	const { plano } = usePlano();
	const isMobile = useIsMobile();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [timeRange, setTimeRange] = React.useState("90d");

	React.useEffect(() => {
		if (isMobile) {
			setTimeRange("7d");
		}
	}, [isMobile]);

	const dias = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

	const {
		data: chartData,
		isLoading,
		isError,
		error,
	} = useQuery({
		queryKey: ["dashboard", "historico", empresa?.id, dias],
		queryFn: () =>
			dashboardService.buscarHistorico({
				idempresa: empresa?.id,
				dias,
			}),
		enabled: !!empresa?.id,
	});

	const isPremium =
		plano?.toUpperCase() === "PREMIUM" || plano?.toUpperCase() === "ENTERPRISE";

	const filteredData = React.useMemo(() => {
		if (!chartData || !Array.isArray(chartData)) return [];
		return chartData.map((item) => ({
			date: item.date,
			contasReceber: Number(item.contasReceber) || 0,
			contasPagar: Number(item.contasPagar) || 0,
		}));
	}, [chartData]);

	const getDescription = () => {
		if (timeRange === "7d") return "Últimos 7 dias";
		if (timeRange === "30d") return "Últimos 30 dias";
		return "Últimos 3 meses";
	};

	if (isLoading) {
		return (
			<Card className="@container/card">
				<CardHeader>
					<CardTitle>Contas a Pagar e Receber</CardTitle>
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
					<CardTitle>Contas a Pagar e Receber</CardTitle>
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

	if (!filteredData || filteredData.length === 0) {
		return (
			<Card className="@container/card">
				<CardHeader>
					<CardTitle>Contas a Pagar e Receber</CardTitle>
					<CardDescription>{getDescription()}</CardDescription>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					<div className="aspect-auto h-[250px] w-full flex items-center justify-center">
						<div className="text-center">
							<p className="text-muted-foreground">
								Nenhum dado disponível para o período selecionado
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Contas a Pagar e Receber</CardTitle>
				<CardDescription>
					<span className="hidden @[540px]/card:block">{getDescription()}</span>
					<span className="@[540px]/card:hidden">{getDescription()}</span>
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
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 relative">
				{!isPremium && (
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/5 backdrop-blur-sm rounded-lg border border-muted-foreground/10 m-2">
						<div className="flex flex-col items-center gap-4 p-6 text-center max-w-sm">
							<div className="p-3 bg-primary/10 rounded-full">
								<IconLock className="w-8 h-8 text-primary" />
							</div>
							<div className="space-y-2">
								<h3 className="font-semibold text-lg">Recurso Premium</h3>
								<p className="text-sm text-muted-foreground">
									A visualização detalhada do gráfico financeiro está disponível
									apenas nos planos Premium e Enterprise.
								</p>
							</div>
							<Button asChild className="w-full">
								<Link href="/meus-planos">Fazer Upgrade</Link>
							</Button>
						</div>
					</div>
				)}
				<ChartContainer
					config={chartConfig}
					className={`aspect-auto h-[250px] w-full transition-all ${!isPremium ? "opacity-20 blur-sm select-none pointer-events-none" : ""}`}
				>
					<AreaChart data={filteredData}>
						<defs>
							<linearGradient
								id="fillContasReceber"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="5%"
									stopColor="var(--color-contasReceber)"
									stopOpacity={1.0}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-contasReceber)"
									stopOpacity={0.1}
								/>
							</linearGradient>
							<linearGradient id="fillContasPagar" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-contasPagar)"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-contasPagar)"
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("pt-BR", {
									month: "short",
									day: "numeric",
								});
							}}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={(value) => {
										return new Date(value).toLocaleDateString("pt-BR", {
											month: "long",
											day: "numeric",
											year: "numeric",
										});
									}}
									indicator="dot"
									formatter={(value) => {
										return new Intl.NumberFormat("pt-BR", {
											style: "currency",
											currency: "BRL",
										}).format(Number(value));
									}}
								/>
							}
						/>
						<Area
							dataKey="contasReceber"
							type="natural"
							fill="url(#fillContasReceber)"
							stroke="var(--color-contasReceber)"
						/>
						<Area
							dataKey="contasPagar"
							type="natural"
							fill="url(#fillContasPagar)"
							stroke="var(--color-contasPagar)"
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

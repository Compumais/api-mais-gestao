"use client";

import {
	IconTrendingDown,
	IconTrendingUp,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { dashboardService } from "@/services/dashboard.service";

const MESES = [
	"Jan",
	"Fev",
	"Mar",
	"Abr",
	"Mai",
	"Jun",
	"Jul",
	"Ago",
	"Set",
	"Out",
	"Nov",
	"Dez",
];

const receitasConfig = {
	receitaAnoAnterior: { label: "Receita ano anterior", color: "#94a3b8" },
	receitaAnoAtual: { label: "Receita ano atual", color: "#16a34a" },
} satisfies ChartConfig;

const despesasConfig = {
	despesaAnoAnterior: { label: "Despesa ano anterior", color: "#fca5a5" },
	despesaAnoAtual: { label: "Despesa ano atual", color: "#ef4444" },
} satisfies ChartConfig;

const saldoConfig = {
	saldoAnoAnterior: { label: "Saldo ano anterior", color: "#94a3b8" },
	saldoAnoAtual: { label: "Saldo ano atual", color: "#3b82f6" },
} satisfies ChartConfig;

const acumuladoConfig = {
	saldoAcumuladoAnoAnterior: {
		label: "Acumulado ano anterior",
		color: "#94a3b8",
	},
	saldoAcumuladoAnoAtual: { label: "Acumulado ano atual", color: "#3b82f6" },
} satisfies ChartConfig;

const variacaoConfig = {
	variacaoReceitaPercentual: { label: "Variação %", color: "#8b5cf6" },
} satisfies ChartConfig;

const evolucaoConfig = {
	receitaAnoAnterior: { label: "Receitas", color: "#16a34a" },
	despesaAnoAnterior: { label: "Despesas", color: "#ef4444" },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		maximumFractionDigits: 0,
	}).format(value);

const formatPercent = (value: number) =>
	`${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export function ComparativoSection() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const anoAtual = new Date().getFullYear();
	const [ano, setAno] = React.useState(String(anoAtual));

	const anosDisponiveis = React.useMemo(
		() => Array.from({ length: 5 }, (_, i) => anoAtual - i),
		[anoAtual],
	);

	const { data, isLoading } = useQuery({
		queryKey: ["dashboard", "comparativo", empresa?.id, ano],
		queryFn: () =>
			dashboardService.buscarComparativo({
				idempresa: empresa?.id,
				ano: Number(ano),
			}),
		enabled: !!empresa?.id,
	});

	const chartData = React.useMemo(() => {
		if (!data?.meses?.length) return [];
		return data.meses.map((item) => ({
			mes: MESES[item.mes - 1] ?? String(item.mes),
			receitaAnoAnterior: item.receitaAnoAnterior,
			despesaAnoAnterior: item.despesaAnoAnterior,
			receitaAnoAtual: item.receitaAnoAtual,
			despesaAnoAtual: item.despesaAnoAtual,
			saldoAnoAnterior: item.saldoAnoAnterior,
			saldoAnoAtual: item.saldoAnoAtual,
			saldoAcumuladoAnoAnterior: item.saldoAcumuladoAnoAnterior,
			saldoAcumuladoAnoAtual: item.saldoAcumuladoAnoAtual,
			variacaoReceitaPercentual: item.variacaoReceitaPercentual,
		}));
	}, [data]);

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 md:gap-6">
			<div className="flex items-center justify-between px-4 lg:px-6">
				<div>
					<h2 className="text-lg font-semibold">Comparativo Anual</h2>
					<p className="text-sm text-muted-foreground">
						{data?.anoAnterior} vs {data?.anoAtual}
					</p>
				</div>
				<Select value={ano} onValueChange={setAno}>
					<SelectTrigger className="w-[120px]">
						<SelectValue placeholder="Ano" />
					</SelectTrigger>
					<SelectContent>
						{anosDisponiveis.map((item) => (
							<SelectItem key={item} value={String(item)}>
								{item}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">
							Receita {data?.anoAnterior}
						</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums text-green-600">
							{formatCurrency(data?.totais.receitaAnoAnterior ?? 0)}
						</CardTitle>
						<CardAction>
							<Badge variant="outline" className="text-green-600">
								<IconTrendingUp className="size-3" />
								Ano anterior
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Total de receitas</CardFooter>
				</Card>

				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">
							Despesa {data?.anoAnterior}
						</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums text-destructive">
							{formatCurrency(data?.totais.despesaAnoAnterior ?? 0)}
						</CardTitle>
						<CardAction>
							<Badge variant="outline" className="text-destructive">
								<IconTrendingDown className="size-3" />
								Ano anterior
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Total de despesas</CardFooter>
				</Card>

				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">
							Receita {data?.anoAtual}
						</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums text-green-600">
							{formatCurrency(data?.totais.receitaAnoAtual ?? 0)}
						</CardTitle>
						<CardAction>
							<Badge variant="outline" className="text-green-600">
								<IconTrendingUp className="size-3" />
								Ano atual
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Total de receitas</CardFooter>
				</Card>

				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">
							Despesa {data?.anoAtual}
						</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums text-destructive">
							{formatCurrency(data?.totais.despesaAnoAtual ?? 0)}
						</CardTitle>
						<CardAction>
							<Badge variant="outline" className="text-destructive">
								<IconTrendingDown className="size-3" />
								Ano atual
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Total de despesas</CardFooter>
				</Card>
			</div>

			<div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
				<Card>
					<CardHeader>
						<CardTitle>Receitas Mensais</CardTitle>
						<CardDescription>Ano anterior vs atual</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={receitasConfig} className="h-[250px] w-full">
							<LineChart data={chartData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="mes" tickLine={false} axisLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<ChartLegend content={<ChartLegendContent />} />
								<Line
									type="monotone"
									dataKey="receitaAnoAnterior"
									stroke="var(--color-receitaAnoAnterior)"
									strokeWidth={2}
									dot={false}
								/>
								<Line
									type="monotone"
									dataKey="receitaAnoAtual"
									stroke="var(--color-receitaAnoAtual)"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Despesas Mensais</CardTitle>
						<CardDescription>Ano anterior vs atual</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={despesasConfig} className="h-[250px] w-full">
							<LineChart data={chartData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="mes" tickLine={false} axisLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<ChartLegend content={<ChartLegendContent />} />
								<Line
									type="monotone"
									dataKey="despesaAnoAnterior"
									stroke="var(--color-despesaAnoAnterior)"
									strokeWidth={2}
									dot={false}
								/>
								<Line
									type="monotone"
									dataKey="despesaAnoAtual"
									stroke="var(--color-despesaAnoAtual)"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Saldo Mensal</CardTitle>
						<CardDescription>Ano anterior vs atual</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={saldoConfig} className="h-[250px] w-full">
							<BarChart data={chartData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="mes" tickLine={false} axisLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<ChartLegend content={<ChartLegendContent />} />
								<Bar dataKey="saldoAnoAnterior" fill="var(--color-saldoAnoAnterior)" />
								<Bar dataKey="saldoAnoAtual" fill="var(--color-saldoAnoAtual)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Saldo Acumulado</CardTitle>
						<CardDescription>Evolução acumulada no ano</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={acumuladoConfig} className="h-[250px] w-full">
							<AreaChart data={chartData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="mes" tickLine={false} axisLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<ChartLegend content={<ChartLegendContent />} />
								<Area
									type="monotone"
									dataKey="saldoAcumuladoAnoAnterior"
									fill="var(--color-saldoAcumuladoAnoAnterior)"
									fillOpacity={0.3}
									stroke="var(--color-saldoAcumuladoAnoAnterior)"
								/>
								<Area
									type="monotone"
									dataKey="saldoAcumuladoAnoAtual"
									fill="var(--color-saldoAcumuladoAnoAtual)"
									fillOpacity={0.3}
									stroke="var(--color-saldoAcumuladoAnoAtual)"
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Variação % das Receitas</CardTitle>
						<CardDescription>Ano atual vs anterior</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={variacaoConfig} className="h-[250px] w-full">
							<LineChart data={chartData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="mes" tickLine={false} axisLine={false} />
								<YAxis tickFormatter={(v) => `${v}%`} />
								<ChartTooltip
									content={
										<ChartTooltipContent
											formatter={(value) => formatPercent(Number(value))}
										/>
									}
								/>
								<Line
									type="monotone"
									dataKey="variacaoReceitaPercentual"
									stroke="var(--color-variacaoReceitaPercentual)"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Receitas x Despesas — {data?.anoAnterior}</CardTitle>
						<CardDescription>Ano anterior</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={evolucaoConfig} className="h-[250px] w-full">
							<BarChart data={chartData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="mes" tickLine={false} axisLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<ChartLegend content={<ChartLegendContent />} />
								<Bar
									dataKey="receitaAnoAnterior"
									fill="var(--color-receitaAnoAnterior)"
								/>
								<Bar
									dataKey="despesaAnoAnterior"
									fill="var(--color-despesaAnoAnterior)"
								/>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>

			<div className="px-4 lg:px-6">
				<Card>
					<CardHeader>
						<CardTitle>Tabela Comparativa</CardTitle>
						<CardDescription>
							Comparativo mês a mês entre {data?.anoAnterior} e {data?.anoAtual}
						</CardDescription>
					</CardHeader>
					<CardContent className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mês</TableHead>
									<TableHead className="text-right">
										Receita {data?.anoAnterior}
									</TableHead>
									<TableHead className="text-right">
										Despesa {data?.anoAnterior}
									</TableHead>
									<TableHead className="text-right">
										Receita {data?.anoAtual}
									</TableHead>
									<TableHead className="text-right">
										Despesa {data?.anoAtual}
									</TableHead>
									<TableHead className="text-right">Δ Receita %</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{chartData.map((item) => (
									<TableRow key={item.mes}>
										<TableCell className="font-medium">{item.mes}</TableCell>
										<TableCell className="text-right text-green-600 tabular-nums">
											{formatCurrency(item.receitaAnoAnterior)}
										</TableCell>
										<TableCell className="text-right text-destructive tabular-nums">
											{formatCurrency(item.despesaAnoAnterior)}
										</TableCell>
										<TableCell className="text-right text-green-600 tabular-nums">
											{formatCurrency(item.receitaAnoAtual)}
										</TableCell>
										<TableCell className="text-right text-destructive tabular-nums">
											{formatCurrency(item.despesaAnoAtual)}
										</TableCell>
										<TableCell
											className={`text-right tabular-nums ${item.variacaoReceitaPercentual >= 0 ? "text-green-600" : "text-destructive"}`}
										>
											{formatPercent(item.variacaoReceitaPercentual)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

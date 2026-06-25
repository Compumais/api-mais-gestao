"use client";

import {
	IconCash,
	IconChartBar,
	IconReceipt,
	IconScale,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";
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
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEmpresa } from "@/hooks/use-empresa";
import { useIsMobile } from "@/hooks/use-mobile";
import { dashboardService } from "@/services/dashboard.service";

const PRODUTOS_COLORS = [
	"#3b82f6",
	"#2563eb",
	"#1d4ed8",
	"#1e40af",
	"#1e3a8a",
];

const vendasChartConfig = {
	total: { label: "Vendas", color: "#3b82f6" },
} satisfies ChartConfig;

const produtosChartConfig = {
	value: { label: "Total", color: "#3b82f6" },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);

const formatDateTime = (value: string | null) => {
	if (!value) return "—";
	return new Intl.DateTimeFormat("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
};

export function VendasSection() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const isMobile = useIsMobile();
	const [timeRange, setTimeRange] = React.useState("90d");

	React.useEffect(() => {
		if (isMobile) {
			setTimeRange("7d");
		}
	}, [isMobile]);

	const dias = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

	const { data: resumo, isLoading: loadingResumo } = useQuery({
		queryKey: ["dashboard", "vendas", empresa?.id, dias],
		queryFn: () =>
			dashboardService.buscarDadosVendas({ idempresa: empresa?.id, dias }),
		enabled: !!empresa?.id,
	});

	const { data: historico, isLoading: loadingHistorico } = useQuery({
		queryKey: ["dashboard", "vendas-historico", empresa?.id, dias],
		queryFn: () =>
			dashboardService.buscarHistoricoVendas({ idempresa: empresa?.id, dias }),
		enabled: !!empresa?.id,
	});

	const { data: topProdutos, isLoading: loadingProdutos } = useQuery({
		queryKey: ["dashboard", "top-produtos", empresa?.id, dias],
		queryFn: () =>
			dashboardService.buscarTopProdutos({ idempresa: empresa?.id, dias }),
		enabled: !!empresa?.id,
	});

	const { data: fechamentos, isLoading: loadingFechamentos } = useQuery({
		queryKey: ["dashboard", "ultimos-fechamentos", empresa?.id],
		queryFn: () =>
			dashboardService.buscarUltimosFechamentos({ idempresa: empresa?.id }),
		enabled: !!empresa?.id,
	});

	const historicoChartData = React.useMemo(() => {
		if (!historico?.length) return [];
		return historico.map((item) => ({
			date: new Intl.DateTimeFormat("pt-BR", {
				day: "2-digit",
				month: "short",
			}).format(new Date(item.date)),
			total: item.total,
		}));
	}, [historico]);

	const produtosChartData =
		topProdutos?.map((item, index) => ({
			id: item.idproduto,
			name: item.nome,
			value: item.total,
			fill: PRODUTOS_COLORS[index % PRODUTOS_COLORS.length],
		})) ?? [];

	return (
		<div className="flex flex-col gap-4 md:gap-6">
			<div className="flex items-center justify-end px-4 lg:px-6">
				<ToggleGroup
					type="single"
					value={timeRange}
					onValueChange={(value) => value && setTimeRange(value)}
					variant="outline"
					className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
				>
					<ToggleGroupItem value="90d">3 meses</ToggleGroupItem>
					<ToggleGroupItem value="30d">30 dias</ToggleGroupItem>
					<ToggleGroupItem value="7d">7 dias</ToggleGroupItem>
				</ToggleGroup>
			</div>

			<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">Total de Vendas</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
							{loadingResumo ? (
								<div className="h-6 w-26 animate-pulse rounded bg-muted" />
							) : (
								formatCurrency(resumo?.totalVendas ?? 0)
							)}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								<IconCash className="size-3" />
								Valor
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Faturamento no período</CardFooter>
				</Card>

				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">
							Quantidade de Vendas
						</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
							{loadingResumo ? (
								<div className="h-6 w-16 animate-pulse rounded bg-muted" />
							) : (
								(resumo?.quantidadeVendas ?? 0).toLocaleString("pt-BR")
							)}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								<IconReceipt className="size-3" />
								Vendas
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Número de vendas realizadas</CardFooter>
				</Card>

				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">
							Fechamentos de Caixa
						</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
							{loadingResumo ? (
								<div className="h-6 w-16 animate-pulse rounded bg-muted" />
							) : (
								(resumo?.quantidadeFechamentos ?? 0).toLocaleString("pt-BR")
							)}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								<IconChartBar className="size-3" />
								Fechamentos
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Fechamentos no período</CardFooter>
				</Card>

				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">
							Diferença nos Fechamentos
						</CardDescription>
						<CardTitle
							className={`text-xl font-semibold tabular-nums @[250px]/card:text-3xl ${(resumo?.diferencaFechamentos ?? 0) >= 0 ? "text-green-600" : "text-destructive"}`}
						>
							{loadingResumo ? (
								<div className="h-6 w-26 animate-pulse rounded bg-muted" />
							) : (
								formatCurrency(resumo?.diferencaFechamentos ?? 0)
							)}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								<IconScale className="size-3" />
								Diferença
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Sobra menos falta</CardFooter>
				</Card>
			</div>

			<div className="px-4 lg:px-6">
				<Card>
					<CardHeader>
						<CardTitle>Histórico de Vendas</CardTitle>
						<CardDescription>Evolução diária no período selecionado</CardDescription>
					</CardHeader>
					<CardContent>
						{loadingHistorico ? (
							<div className="flex h-[300px] items-center justify-center">
								<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							</div>
						) : (
							<ChartContainer
								config={vendasChartConfig}
								className="aspect-auto h-[300px] w-full"
							>
								<AreaChart data={historicoChartData}>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="date"
										tickLine={false}
										axisLine={false}
										tickMargin={8}
										minTickGap={32}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												formatter={(value) => formatCurrency(Number(value))}
											/>
										}
									/>
									<Area
										dataKey="total"
										type="monotone"
										fill="var(--color-total)"
										fillOpacity={0.4}
										stroke="var(--color-total)"
									/>
								</AreaChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
				<Card>
					<CardHeader>
						<CardTitle>Top 5 Produtos</CardTitle>
						<CardDescription>Mais vendidos por valor</CardDescription>
					</CardHeader>
					<CardContent>
						{loadingProdutos ? (
							<div className="flex h-[250px] items-center justify-center">
								<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							</div>
						) : produtosChartData.length === 0 ? (
							<div className="flex h-[250px] items-center justify-center text-muted-foreground">
								Nenhum produto encontrado
							</div>
						) : (
							<ChartContainer
								config={produtosChartConfig}
								className="mx-auto aspect-square max-h-[250px]"
							>
								<PieChart>
									<ChartTooltip content={<ChartTooltipContent hideLabel />} />
									<Pie
										data={produtosChartData}
										dataKey="value"
										nameKey="name"
										innerRadius={60}
										strokeWidth={2}
									>
										{produtosChartData.map((entry) => (
											<Cell key={entry.id} fill={entry.fill} />
										))}
									</Pie>
								</PieChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Últimos Fechamentos</CardTitle>
						<CardDescription>5 fechamentos mais recentes</CardDescription>
					</CardHeader>
					<CardContent>
						{loadingFechamentos ? (
							<div className="flex h-32 items-center justify-center">
								<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Data/Hora</TableHead>
										<TableHead>PDV</TableHead>
										<TableHead className="text-right">Diferença</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(fechamentos ?? []).length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={3}
												className="text-center text-muted-foreground"
											>
												Nenhum fechamento encontrado
											</TableCell>
										</TableRow>
									) : (
										fechamentos?.map((item) => (
											<TableRow key={item.id}>
												<TableCell>{formatDateTime(item.datahora)}</TableCell>
												<TableCell>{item.pdv ?? "—"}</TableCell>
												<TableCell
													className={`text-right ${item.diferenca >= 0 ? "text-green-600" : "text-destructive"}`}
												>
													{formatCurrency(item.diferenca)}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

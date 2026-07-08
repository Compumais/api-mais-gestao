"use client";

import {
	IconReceipt,
	IconTrendingDown,
	IconTrendingUp,
	IconWallet,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
} from "recharts";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ChartPieDespesas } from "@/components/chart-pie-despesas";
import { ChartPieReceitas } from "@/components/chart-pie-receitas";
import { DashboardTable } from "@/components/dashboard-table";
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

const MESES_LABEL = [
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

const evolucaoChartConfig = {
	receitas: { label: "Receitas", color: "#16a34a" },
	despesas: { label: "Despesas", color: "#ef4444" },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);

const formatDate = (value: string) =>
	new Intl.DateTimeFormat("pt-BR").format(new Date(value));

export function FinanceiroSection() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const isMobile = useIsMobile();
	const [timeRange, setTimeRange] = React.useState("90d");

	React.useEffect(() => {
		if (isMobile) {
			setTimeRange("7d");
		}
	}, [isMobile]);

	const dias = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
	const anoAtual = new Date().getFullYear();

	const { data: resumo, isLoading: loadingResumo } = useQuery({
		queryKey: ["dashboard", "financeiro-resumo", empresa?.id, dias],
		queryFn: () =>
			dashboardService.buscarFinanceiroResumo({
				idempresa: empresa?.id,
				dias,
			}),
		enabled: !!empresa?.id,
	});

	const { data: evolucao, isLoading: loadingEvolucao } = useQuery({
		queryKey: ["dashboard", "evolucao-mensal", empresa?.id, dias],
		queryFn: () =>
			dashboardService.buscarEvolucaoMensal({
				idempresa: empresa?.id,
				dias,
			}),
		enabled: !!empresa?.id,
	});

	const { data: topDespesas, isLoading: loadingTopDespesas } = useQuery({
		queryKey: ["dashboard", "top-despesas-valor", empresa?.id, dias],
		queryFn: () =>
			dashboardService.buscarTopDespesasValor({
				idempresa: empresa?.id,
				dias,
			}),
		enabled: !!empresa?.id,
	});

	const { data: ultimasMovimentacoes, isLoading: loadingMovimentacoes } =
		useQuery({
			queryKey: ["dashboard-ultimas-movimentacoes", empresa?.id],
			queryFn: () =>
				dashboardService.buscarUltimasMovimentacoes({ idempresa: empresa?.id }),
			enabled: !!empresa?.id,
		});

	const evolucaoChartData = React.useMemo(() => {
		if (!evolucao?.length) return [];
		return evolucao.map((item) => ({
			mes:
				item.mes <= 12
					? MESES_LABEL[item.mes - 1] ?? String(item.mes)
					: String(item.mes),
			receitas: item.receitas,
			despesas: item.despesas,
		}));
	}, [evolucao]);

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
						<CardDescription className="text-xs">Total Receitas</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl text-green-600">
							{loadingResumo ? (
								<div className="h-6 w-26 animate-pulse rounded bg-muted" />
							) : (
								formatCurrency(resumo?.totalReceitas ?? 0)
							)}
						</CardTitle>
						<CardAction>
							<IconTrendingUp className="size-6 text-green-600" />
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Entradas no período</CardFooter>
				</Card>

				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">Total Despesas</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl text-destructive">
							{loadingResumo ? (
								<div className="h-6 w-26 animate-pulse rounded bg-muted" />
							) : (
								formatCurrency(resumo?.totalDespesas ?? 0)
							)}
						</CardTitle>
						<CardAction>
							<IconTrendingDown className="size-6 text-destructive" />
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Saídas no período</CardFooter>
				</Card>

				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">Saldo</CardDescription>
						<CardTitle
							className={`text-xl font-semibold tabular-nums @[250px]/card:text-3xl ${(resumo?.saldo ?? 0) >= 0 ? "text-green-600" : "text-destructive"}`}
						>
							{loadingResumo ? (
								<div className="h-6 w-26 animate-pulse rounded bg-muted" />
							) : (
								formatCurrency(resumo?.saldo ?? 0)
							)}
						</CardTitle>
						<CardAction>
							<IconWallet className="size-6" />
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Receitas menos despesas</CardFooter>
				</Card>

				<Card className="@container/card justify-between">
					<CardHeader>
						<CardDescription className="text-xs">
							Total Lançamentos
						</CardDescription>
						<CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-3xl">
							{loadingResumo ? (
								<div className="h-6 w-16 animate-pulse rounded bg-muted" />
							) : (
								(resumo?.totalLancamentos ?? 0).toLocaleString("pt-BR")
							)}
						</CardTitle>
						<CardAction>
							<IconReceipt className="size-5" />
						</CardAction>
					</CardHeader>
					<CardFooter className="text-xs">Financeiro + bancário</CardFooter>
				</Card>
			</div>

			<div className="px-4 lg:px-6">
				<ChartAreaInteractive />
			</div>

			<div className="px-4 lg:px-6">
				<Card>
					<CardHeader>
						<CardTitle>Receitas x Despesas por Mês</CardTitle>
						<CardDescription>
							Evolução mensal em {anoAtual}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{loadingEvolucao ? (
							<div className="flex h-[300px] items-center justify-center">
								<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							</div>
						) : (
							<ChartContainer
								config={evolucaoChartConfig}
								className="aspect-auto h-[300px] w-full"
							>
								<BarChart data={evolucaoChartData}>
									<CartesianGrid vertical={false} />
									<XAxis dataKey="mes" tickLine={false} axisLine={false} />
									<YAxis
										tickLine={false}
										axisLine={false}
										tickFormatter={(v) =>
											new Intl.NumberFormat("pt-BR", {
												notation: "compact",
												compactDisplay: "short",
											}).format(v)
										}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<ChartLegend content={<ChartLegendContent />} />
									<Bar
										dataKey="receitas"
										fill="var(--color-receitas)"
										radius={[4, 4, 0, 0]}
									/>
									<Bar
										dataKey="despesas"
										fill="var(--color-despesas)"
										radius={[4, 4, 0, 0]}
									/>
								</BarChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
				<ChartPieDespesas />
				<ChartPieReceitas />
			</div>

			<div className="px-4 lg:px-6">
				<Card>
					<CardHeader>
						<CardTitle>Top 10 Maiores Despesas</CardTitle>
						<CardDescription>Lançamentos individuais no período</CardDescription>
					</CardHeader>
					<CardContent>
						{loadingTopDespesas ? (
							<div className="flex h-32 items-center justify-center">
								<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Descrição</TableHead>
										<TableHead>Plano de Contas</TableHead>
										<TableHead>Data</TableHead>
										<TableHead className="text-right">Valor</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(topDespesas ?? []).length === 0 ? (
										<TableRow>
											<TableCell colSpan={4} className="text-center text-muted-foreground">
												Nenhuma despesa encontrada
											</TableCell>
										</TableRow>
									) : (
										topDespesas?.map((item) => (
											<TableRow key={item.id}>
												<TableCell className="font-medium">
													{item.descricao}
												</TableCell>
												<TableCell>{item.planoContas ?? "—"}</TableCell>
												<TableCell>{formatDate(item.data)}</TableCell>
												<TableCell className="text-right text-destructive">
													{formatCurrency(item.valor)}
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

			<div className="px-4 lg:px-6">
				<DashboardTable
					data={ultimasMovimentacoes}
					isLoading={loadingMovimentacoes}
				/>
			</div>
		</div>
	);
}

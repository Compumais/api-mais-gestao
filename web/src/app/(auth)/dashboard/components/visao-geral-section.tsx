"use client";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
} from "recharts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
	Card,
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useDashboardFilters } from "@/hooks/dashboard/dashboard-filters-context";
import {
	useDashboardExecutivo,
	useDashboardInsights,
} from "@/hooks/dashboard/use-dashboard-queries";
import { useEntitlements } from "@/hooks/use-plano";
import {
	formatCurrency,
	formatNumber,
	formatPercent,
	type DashboardTab,
} from "@/lib/dashboard-periodo";

const evolucaoConfig = {
	total: { label: "Faturamento", color: "var(--chart-1)" },
} satisfies ChartConfig;

const receitasDespesasConfig = {
	valor: { label: "Valor", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function VisaoGeralSection() {
	const { setTab } = useDashboardFilters();
	const { hasFeature } = useEntitlements();
	const temCompleto = hasFeature("dashboard_completo");
	const { data, isLoading } = useDashboardExecutivo();
	const { data: insights } = useDashboardInsights({ enabled: temCompleto });

	if (isLoading || !data) {
		return (
			<div className="px-4 text-sm text-muted-foreground lg:px-6">
				Carregando visão executiva…
			</div>
		);
	}

	const receitasDespesasData = [
		{ nome: "Receitas", valor: data.receitasDespesas.receitas },
		{ nome: "Despesas", valor: data.receitasDespesas.despesas },
	];

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				<KpiCard
					titulo="Faturamento"
					valor={formatCurrency(data.faturamento.valor)}
					variacaoPeriodoAnteriorPct={data.faturamento.variacaoPeriodoAnteriorPct}
					variacaoYoYPct={data.faturamento.variacaoYoYPct}
					onClick={() => setTab("vendas")}
				/>
				<KpiCard
					titulo="Lucro bruto"
					valor={formatCurrency(data.lucroBruto.valor)}
					subtitulo={`Margem ${formatPercent(data.lucroBruto.margemBrutaPct)}`}
					variacaoPeriodoAnteriorPct={data.lucroBruto.variacaoPeriodoAnteriorPct}
					variacaoYoYPct={data.lucroBruto.variacaoYoYPct}
					onClick={() => setTab(temCompleto ? "rentabilidade" : "vendas")}
				/>
				<KpiCard
					titulo="Saldo de caixa"
					valor={formatCurrency(data.caixa.saldoAtual)}
					subtitulo={`Projetado ${formatCurrency(data.caixa.saldoProjetado)}`}
					onClick={() => setTab(temCompleto ? "fluxo-caixa" : "financeiro")}
				/>
				<KpiCard
					titulo="Contas a receber"
					valor={formatCurrency(data.financeiro.contasReceberAberto)}
					subtitulo={`Vencido ${formatCurrency(data.financeiro.valorVencido)}`}
					onClick={() => setTab("financeiro")}
				/>
				<KpiCard
					titulo="Contas a pagar"
					valor={formatCurrency(data.financeiro.contasPagarAberto)}
					subtitulo={`Resultado op. ${formatCurrency(data.financeiro.resultadoOperacional)}`}
					onClick={() => setTab("financeiro")}
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					titulo="Lucro líquido"
					valor={formatCurrency(data.lucroLiquido.valor)}
					subtitulo={`Margem ${formatPercent(data.lucroLiquido.margemLiquidaPct)}`}
					variacaoPeriodoAnteriorPct={
						data.lucroLiquido.variacaoPeriodoAnteriorPct
					}
				/>
				<KpiCard
					titulo="Vendas"
					valor={formatNumber(data.vendas.quantidade)}
					subtitulo={`Ticket médio ${formatCurrency(data.vendas.ticketMedio)}`}
				/>
				<KpiCard
					titulo="Itens vendidos"
					valor={formatNumber(data.vendas.itensVendidos)}
				/>
				<KpiCard
					titulo="Clientes atendidos"
					valor={formatNumber(data.vendas.clientesAtendidos)}
					onClick={() => setTab(temCompleto ? "clientes" : "vendas")}
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Evolução do faturamento</CardTitle>
					<CardDescription>Série diária no período selecionado</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={evolucaoConfig} className="h-[280px] w-full">
						<AreaChart data={data.evolucaoFaturamento}>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="date" tickLine={false} axisLine={false} />
							<YAxis tickLine={false} axisLine={false} width={60} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Area
								type="monotone"
								dataKey="total"
								stroke="var(--color-total)"
								fill="var(--color-total)"
								fillOpacity={0.2}
							/>
						</AreaChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Receitas × Despesas</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={receitasDespesasConfig}
							className="h-[240px] w-full"
						>
							<BarChart data={receitasDespesasData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="nome" tickLine={false} axisLine={false} />
								<YAxis tickLine={false} axisLine={false} width={60} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Mini fluxo de caixa</CardTitle>
						<CardDescription>Entradas e saídas previstas (30 dias)</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Saldo atual</span>
							<span className="font-medium tabular-nums">
								{formatCurrency(data.caixa.saldoAtual)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Entradas previstas</span>
							<span className="font-medium tabular-nums text-emerald-600">
								{formatCurrency(data.caixa.entradasPrevistas)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Saídas previstas</span>
							<span className="font-medium tabular-nums text-red-600">
								{formatCurrency(data.caixa.saidasPrevistas)}
							</span>
						</div>
						<div className="flex justify-between border-t pt-3">
							<span className="font-medium">Saldo projetado</span>
							<span className="font-semibold tabular-nums">
								{formatCurrency(data.caixa.saldoProjetado)}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Top produtos</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Produto</TableHead>
									<TableHead className="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.topProdutos.map((item) => (
									<TableRow key={item.idproduto}>
										<TableCell>{item.nome}</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(item.total)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Top clientes</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Cliente</TableHead>
									<TableHead className="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.topClientes.map((item) => (
									<TableRow key={item.identidade}>
										<TableCell>{item.nome}</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(item.total)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Alertas e insights</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{(insights ?? []).slice(0, 5).map((insight) => (
							<button
								key={insight.codigo}
								type="button"
								className="block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50"
								onClick={() => setTab(insight.tabAlvo as DashboardTab)}
							>
								<span className="mr-2">
									{insight.severidade === "positivo"
										? "●"
										: insight.severidade === "atencao"
											? "▲"
											: "■"}
								</span>
								{insight.mensagem}
							</button>
						))}
						{!temCompleto && (
							<p className="text-sm text-muted-foreground">
								Alertas automáticos disponíveis no plano com Dashboard Completo.
							</p>
						)}
						{temCompleto && (!insights || insights.length === 0) && (
							<p className="text-sm text-muted-foreground">
								Nenhum insight no período.
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

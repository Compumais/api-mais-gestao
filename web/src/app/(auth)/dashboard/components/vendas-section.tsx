"use client";

import * as React from "react";
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
import {
	useDashboardMatrizProdutos,
	useDashboardTopProdutosAvancado,
	useDashboardVendasAvancadas,
	useDashboardVendasPorDiaSemana,
	useDashboardVendasPorHora,
} from "@/hooks/dashboard/use-dashboard-queries";
import {
	formatCurrency,
	formatNumber,
	formatPercent,
} from "@/lib/dashboard-periodo";
import type { RankingOrdenacao } from "@/services/dashboard.service";

const DIAS_SEMANA = [
	"Dom",
	"Seg",
	"Ter",
	"Qua",
	"Qui",
	"Sex",
	"Sáb",
];

const chartConfig = {
	total: { label: "Total", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function VendasSection() {
	const [ordenacao, setOrdenacao] =
		React.useState<RankingOrdenacao>("faturamento");

	const { data: kpis, isLoading } = useDashboardVendasAvancadas();
	const { data: porHora } = useDashboardVendasPorHora();
	const { data: porDia } = useDashboardVendasPorDiaSemana();
	const { data: tops } = useDashboardTopProdutosAvancado(ordenacao);
	const { data: matriz } = useDashboardMatrizProdutos();

	if (isLoading || !kpis) {
		return (
			<div className="px-4 text-sm text-muted-foreground lg:px-6">
				Carregando vendas…
			</div>
		);
	}

	const itensPorVenda =
		kpis.quantidadeVendas > 0
			? kpis.itensVendidos / kpis.quantidadeVendas
			: 0;
	const valorMedioItem =
		kpis.itensVendidos > 0 ? kpis.faturamento / kpis.itensVendidos : 0;

	const horaData = (porHora ?? []).map((h) => ({
		label: `${String(h.hora).padStart(2, "0")}h`,
		total: h.total,
	}));

	const diaData = (porDia ?? []).map((d) => ({
		label: DIAS_SEMANA[d.diaSemana] ?? String(d.diaSemana),
		total: d.total,
	}));

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				<KpiCard
					titulo="Faturamento"
					valor={formatCurrency(kpis.faturamento)}
					variacaoPeriodoAnteriorPct={kpis.variacaoFaturamentoPct}
				/>
				<KpiCard
					titulo="Quantidade de vendas"
					valor={formatNumber(kpis.quantidadeVendas)}
				/>
				<KpiCard
					titulo="Ticket médio"
					valor={formatCurrency(kpis.ticketMedio)}
				/>
				<KpiCard
					titulo="Itens vendidos"
					valor={formatNumber(kpis.itensVendidos)}
					subtitulo={`Média ${formatNumber(itensPorVenda, 1)} / venda`}
				/>
				<KpiCard
					titulo="Valor médio / item"
					valor={formatCurrency(valorMedioItem)}
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					titulo="Clientes"
					valor={formatNumber(kpis.clientesAtendidos)}
				/>
				<KpiCard
					titulo="Novos clientes"
					valor={formatNumber(kpis.clientesNovos)}
					subtitulo={`Ticket ${formatCurrency(kpis.ticketMedioNovos)}`}
				/>
				<KpiCard
					titulo="Clientes recorrentes"
					valor={formatNumber(kpis.clientesRecorrentes)}
					subtitulo={`Ticket ${formatCurrency(kpis.ticketMedioRecorrentes)}`}
				/>
				<KpiCard
					titulo="Itens por venda"
					valor={formatNumber(itensPorVenda, 2)}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Vendas por horário</CardTitle>
						<CardDescription>Identifique picos de movimento</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-[260px] w-full">
							<BarChart data={horaData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis tickLine={false} axisLine={false} width={50} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="total" fill="var(--color-total)" radius={3} />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Vendas por dia da semana</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-[260px] w-full">
							<AreaChart data={diaData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis tickLine={false} axisLine={false} width={50} />
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
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-2">
					<div>
						<CardTitle>Top produtos</CardTitle>
						<CardDescription>Ranking com margem e lucro</CardDescription>
					</div>
					<Select
						value={ordenacao}
						onValueChange={(v) => setOrdenacao(v as RankingOrdenacao)}
					>
						<SelectTrigger className="w-[180px]" size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="faturamento">Faturamento</SelectItem>
							<SelectItem value="quantidade">Quantidade</SelectItem>
							<SelectItem value="lucro">Lucro</SelectItem>
							<SelectItem value="margem">Margem</SelectItem>
						</SelectContent>
					</Select>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Produto</TableHead>
								<TableHead className="text-right">Qtd</TableHead>
								<TableHead className="text-right">Faturamento</TableHead>
								<TableHead className="text-right">Custo</TableHead>
								<TableHead className="text-right">Lucro</TableHead>
								<TableHead className="text-right">Margem</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(tops ?? []).map((item) => (
								<TableRow key={item.idproduto}>
									<TableCell>{item.nome}</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatNumber(item.quantidade, 2)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(item.faturamento)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(item.custo)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(item.lucro)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatPercent(item.margemPct)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Matriz produto × indicador</CardTitle>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Produto</TableHead>
								<TableHead className="text-right">Vendas</TableHead>
								<TableHead className="text-right">Faturamento</TableHead>
								<TableHead className="text-right">Custo</TableHead>
								<TableHead className="text-right">Lucro</TableHead>
								<TableHead className="text-right">Margem</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(matriz ?? []).slice(0, 30).map((item) => (
								<TableRow key={item.idproduto}>
									<TableCell>{item.nome}</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatNumber(item.vendas)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(item.faturamento)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(item.custo)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(item.lucro)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatPercent(item.margemPct)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

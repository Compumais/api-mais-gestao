"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
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
import {
	useDashboardClientes,
	useDashboardClientesRfm,
} from "@/hooks/dashboard/use-dashboard-queries";
import {
	formatCurrency,
	formatNumber,
} from "@/lib/dashboard-periodo";

const chartConfig = {
	total: { label: "Clientes", color: "var(--chart-1)" },
} satisfies ChartConfig;

const SEGMENTO_LABEL: Record<string, string> = {
	vip: "VIP",
	fieis: "Fiéis",
	risco: "Em risco",
	inativos: "Inativos",
	novos: "Novos",
};

export function ClientesSection() {
	const { data, isLoading } = useDashboardClientes();
	const { data: rfm } = useDashboardClientesRfm();

	if (isLoading || !data) {
		return (
			<div className="px-4 text-sm text-muted-foreground lg:px-6">
				Carregando clientes…
			</div>
		);
	}

	const novosVsRec = [
		{ nome: "Novos", total: data.clientesNovos },
		{ nome: "Recorrentes", total: data.clientesRecorrentes },
	];

	const segmentosChart = rfm
		? Object.entries(rfm.segmentos).map(([nome, total]) => ({
				nome: SEGMENTO_LABEL[nome] ?? nome,
				total,
			}))
		: [];

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
				<KpiCard
					titulo="Clientes atendidos"
					valor={formatNumber(data.clientesAtendidos)}
				/>
				<KpiCard
					titulo="Novos"
					valor={formatNumber(data.clientesNovos)}
				/>
				<KpiCard
					titulo="Recorrentes"
					valor={formatNumber(data.clientesRecorrentes)}
				/>
				<KpiCard
					titulo="Ticket médio / cliente"
					valor={formatCurrency(data.ticketMedio)}
				/>
				<KpiCard
					titulo="Faturamento"
					valor={formatCurrency(data.faturamento)}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Novos × recorrentes</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-[240px] w-full">
							<BarChart data={novosVsRec}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="nome" tickLine={false} axisLine={false} />
								<YAxis tickLine={false} axisLine={false} width={40} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="total" fill="var(--color-total)" radius={4} />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Segmentação RFM</CardTitle>
						<CardDescription>Recência · Frequência · Valor</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-[240px] w-full">
							<BarChart data={segmentosChart}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="nome" tickLine={false} axisLine={false} />
								<YAxis tickLine={false} axisLine={false} width={40} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="total" fill="var(--color-total)" radius={4} />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Top clientes</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Cliente</TableHead>
									<TableHead className="text-right">Compras</TableHead>
									<TableHead className="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.topClientes.map((c) => (
									<TableRow key={c.identidade}>
										<TableCell>{c.nome}</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatNumber(c.quantidade)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(c.total)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Clientes RFM</CardTitle>
					</CardHeader>
					<CardContent className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Cliente</TableHead>
									<TableHead>Segmento</TableHead>
									<TableHead className="text-right">Recência</TableHead>
									<TableHead className="text-right">Freq.</TableHead>
									<TableHead className="text-right">Valor</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(rfm?.clientes ?? []).slice(0, 20).map((c) => (
									<TableRow key={c.identidade}>
										<TableCell>{c.nome}</TableCell>
										<TableCell>
											<Badge variant="outline">
												{SEGMENTO_LABEL[c.segmento] ?? c.segmento}
											</Badge>
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatNumber(c.recenciaDias)}d
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatNumber(c.frequencia)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(c.monetario)}
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

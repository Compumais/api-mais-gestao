"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	XAxis,
} from "recharts";
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
import { adminService } from "@/services/admin.service";

const CORES_PIZZA = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6"];

const chartConfig = {
	valor: { label: "Valor", color: "#2563eb" },
} satisfies ChartConfig;

function formatarMoeda(valor: number) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(valor);
}

export default function SuperDashboardPage() {
	const { data, isLoading } = useQuery({
		queryKey: ["admin-dashboard"],
		queryFn: () => adminService.buscarDashboard(),
	});

	if (isLoading || !data) {
		return <p className="text-muted-foreground">Carregando dashboard...</p>;
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Dashboard da Plataforma</h1>
				<p className="text-muted-foreground">
					Visão global de usuários, empresas e faturamento estimado
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total de usuários</CardDescription>
						<CardTitle className="text-3xl">{data.totalUsuarios}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Total de empresas</CardDescription>
						<CardTitle className="text-3xl">{data.totalEmpresas}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Assinantes ativos (estimado)</CardDescription>
						<CardTitle className="text-3xl">{data.totalPagamentos}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Faturamento do mês (estimado)</CardDescription>
						<CardTitle className="text-3xl">
							{formatarMoeda(data.faturamentoMesAtual)}
						</CardTitle>
					</CardHeader>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Faturamento mensal {new Date().getFullYear()}</CardTitle>
					<CardDescription>
						Estimativa com base nos planos ativos por mês
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ChartContainer config={chartConfig} className="h-[300px] w-full">
						<AreaChart data={data.faturamentoMensal}>
							<CartesianGrid vertical={false} />
							<XAxis dataKey="label" />
							<ChartTooltip
								content={
									<ChartTooltipContent
										formatter={(value) => formatarMoeda(Number(value))}
									/>
								}
							/>
							<Area
								type="monotone"
								dataKey="valor"
								stroke="var(--color-valor)"
								fill="var(--color-valor)"
								fillOpacity={0.2}
							/>
						</AreaChart>
					</ChartContainer>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Top 5 assinantes (mais tempo)</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="mx-auto h-[280px]">
							<PieChart>
								<Pie
									data={data.topAssinantes.map((item) => ({
										name: item.nome,
										value: 1,
									}))}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={90}
									label={({ name }) => name}
								>
									{data.topAssinantes.map((_, index) => (
										<Cell
											key={index.toPrecision()}
											fill={CORES_PIZZA[index % CORES_PIZZA.length]}
										/>
									))}
								</Pie>
								<ChartTooltip content={<ChartTooltipContent />} />
							</PieChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Top 5 empresas (mais registros)</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="mx-auto h-[280px]">
							<PieChart>
								<Pie
									data={data.topEmpresas.map((item) => ({
										name: item.nome,
										value: item.totalRegistros,
									}))}
									dataKey="value"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={90}
									label={({ name, value }) => `${name}: ${value}`}
								>
									{data.topEmpresas.map((_, index) => (
										<Cell
											key={index.toString()}
											fill={CORES_PIZZA[index % CORES_PIZZA.length]}
										/>
									))}
								</Pie>
								<ChartTooltip content={<ChartTooltipContent />} />
							</PieChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

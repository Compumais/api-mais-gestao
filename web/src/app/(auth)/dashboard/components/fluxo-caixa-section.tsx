"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { VisualErrorBoundary } from "@/components/error-boundary/visual-error-boundary";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboardFluxoCaixa } from "@/hooks/dashboard/use-dashboard-queries";
import { formatCurrency, formatNumber } from "@/lib/dashboard-periodo";
import { formatDateCurtaBrasilia, formatMesAnoCivil } from "@/lib/date";

const chartConfig = {
	entradas: { label: "Entradas", color: "#2563eb" },
	saidas: { label: "Saídas", color: "#dc2626" },
	saldo: { label: "Saldo", color: "#eab308" },
} satisfies ChartConfig;

type PontoFluxo = {
	date: string;
	entradas: number;
	saidas: number;
	saldo: number;
};

function agruparFluxoPorMes(dias: PontoFluxo[]): PontoFluxo[] {
	const meses = new Map<string, PontoFluxo>();
	for (const dia of dias) {
		const mes = dia.date.slice(0, 7);
		const atual = meses.get(mes);
		if (!atual) {
			meses.set(mes, {
				date: mes,
				entradas: dia.entradas,
				saidas: dia.saidas,
				saldo: dia.saldo,
			});
			continue;
		}
		atual.entradas += dia.entradas;
		atual.saidas += dia.saidas;
		atual.saldo = dia.saldo;
	}
	return [...meses.values()];
}

export function FluxoCaixaSection() {
	const [modo, setModo] = React.useState<"historico" | "projetado">(
		"historico",
	);
	const [horizonte, setHorizonte] = React.useState("30");
	const [granularidade, setGranularidade] = React.useState<
		"diario" | "mensal"
	>("diario");

	const { data, isLoading } = useDashboardFluxoCaixa(modo, Number(horizonte));

	if (isLoading || !data) {
		return (
			<div className="px-4 text-sm text-muted-foreground lg:px-6">
				Carregando fluxo de caixa…
			</div>
		);
	}

	const dias = data.dias;
	const serie =
		granularidade === "diario" ? dias : agruparFluxoPorMes(dias);
	const maiorEntrada = Math.max(0, ...dias.map((d) => d.entradas));
	const maiorSaida = Math.max(0, ...dias.map((d) => d.saidas));
	const diaMenorSaldo = dias.reduce(
		(acc, d) => (d.saldo < acc.saldo ? d : acc),
		dias[0] ?? { date: "—", entradas: 0, saidas: 0, saldo: 0 },
	);
	const diaNegativo = dias.find((d) => d.saldo < 0);
	const mediaEntradas =
		dias.length > 0
			? dias.reduce((s, d) => s + d.entradas, 0) / dias.length
			: 0;
	const mediaSaidas =
		dias.length > 0 ? dias.reduce((s, d) => s + d.saidas, 0) / dias.length : 0;

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<div className="flex flex-wrap items-center gap-3">
				<ToggleGroup
					type="single"
					value={modo}
					onValueChange={(v) => {
						if (v) setModo(v as "historico" | "projetado");
					}}
					variant="outline"
				>
					<ToggleGroupItem value="historico">Histórico</ToggleGroupItem>
					<ToggleGroupItem value="projetado">Projetado</ToggleGroupItem>
				</ToggleGroup>

				{modo === "projetado" && (
					<ToggleGroup
						type="single"
						value={horizonte}
						onValueChange={(v) => {
							if (v) setHorizonte(v);
						}}
						variant="outline"
					>
						{["7", "15", "30", "60", "90"].map((h) => (
							<ToggleGroupItem key={h} value={h}>
								{h}d
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				)}

				<ToggleGroup
					type="single"
					value={granularidade}
					onValueChange={(v) => {
						if (v) setGranularidade(v as "diario" | "mensal");
					}}
					variant="outline"
				>
					<ToggleGroupItem value="diario">Diário</ToggleGroupItem>
					<ToggleGroupItem value="mensal">Mensal</ToggleGroupItem>
				</ToggleGroup>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<KpiCard
					titulo="Saldo inicial"
					valor={formatCurrency(data.saldoInicial)}
				/>
				<KpiCard titulo="Maior entrada" valor={formatCurrency(maiorEntrada)} />
				<KpiCard titulo="Maior saída" valor={formatCurrency(maiorSaida)} />
				<KpiCard
					titulo="Dia com menor saldo"
					valor={formatCurrency(diaMenorSaldo.saldo)}
					subtitulo={diaMenorSaldo.date}
				/>
				<KpiCard
					titulo="Primeiro saldo negativo"
					valor={diaNegativo ? formatCurrency(diaNegativo.saldo) : "—"}
					subtitulo={diaNegativo?.date ?? "Não projetado"}
				/>
				<KpiCard
					titulo="Médias diárias"
					valor={formatCurrency(mediaEntradas)}
					subtitulo={`Saídas ${formatCurrency(mediaSaidas)} · ${formatNumber(dias.length)} dias`}
				/>
			</div>

			<VisualErrorBoundary>
				<Card>
					<CardHeader>
						<CardTitle>
							{modo === "historico" ? "Fluxo realizado" : "Projeção de caixa"}
						</CardTitle>
						<CardDescription>
							{granularidade === "diario"
								? "Entradas, saídas e saldo diário"
								: "Entradas, saídas e saldo de fechamento do mês"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-[320px] w-full">
							<AreaChart data={serie}>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="date"
									tickLine={false}
									axisLine={false}
									tickFormatter={(value) =>
										granularidade === "mensal"
											? formatMesAnoCivil(String(value))
											: formatDateCurtaBrasilia(String(value))
									}
								/>
								<YAxis tickLine={false} axisLine={false} width={60} />
								<ChartTooltip
									content={
										<ChartTooltipContent
											labelFormatter={(value) =>
												granularidade === "mensal"
													? formatMesAnoCivil(String(value))
													: formatDateCurtaBrasilia(String(value))
											}
										/>
									}
								/>
								<Area
									type="monotone"
									dataKey="entradas"
									stroke="var(--color-entradas)"
									fill="var(--color-entradas)"
									fillOpacity={0.12}
									strokeWidth={2}
								/>
								<Area
									type="monotone"
									dataKey="saidas"
									stroke="var(--color-saidas)"
									fill="var(--color-saidas)"
									fillOpacity={0.12}
									strokeWidth={2}
								/>
								<Area
									type="monotone"
									dataKey="saldo"
									stroke="var(--color-saldo)"
									fill="var(--color-saldo)"
									fillOpacity={0.12}
									strokeWidth={2}
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</VisualErrorBoundary>
		</div>
	);
}

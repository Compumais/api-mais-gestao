"use client";

import * as React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { useDashboardComparativoFlexivel } from "@/hooks/dashboard/use-dashboard-queries";
import {
	formatCurrency,
	formatPercent,
} from "@/lib/dashboard-periodo";
import type { ComparativoFlexivelModo } from "@/services/dashboard.service";
import { cn } from "@/lib/utils";

export function ComparativoSection() {
	const [modo, setModo] =
		React.useState<ComparativoFlexivelModo>("mes_x_anterior");
	const { data, isLoading } = useDashboardComparativoFlexivel(modo);

	const linhas = data
		? [
				data.metricas.faturamento,
				data.metricas.receitas,
				data.metricas.despesas,
				data.metricas.resultado,
			]
		: [];

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<div className="flex justify-end">
				<Select
					value={modo}
					onValueChange={(v) => setModo(v as ComparativoFlexivelModo)}
				>
					<SelectTrigger className="w-[260px]" size="sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ano_x_ano">Ano × Ano</SelectItem>
						<SelectItem value="mes_x_anterior">Mês × Mês anterior</SelectItem>
						<SelectItem value="mes_x_yoy">Mês × Mesmo mês ano anterior</SelectItem>
						<SelectItem value="personalizado">Período personalizado</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Comparativo executivo</CardTitle>
					<CardDescription>
						Indicadores do período atual versus o período de comparação
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading || !data ? (
						<p className="text-sm text-muted-foreground">
							Carregando comparativo…
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Indicador</TableHead>
									<TableHead className="text-right">Período atual</TableHead>
									<TableHead className="text-right">Período anterior</TableHead>
									<TableHead className="text-right">Variação</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{linhas.map((item) => (
									<TableRow key={item.label}>
										<TableCell className="font-medium">{item.label}</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(item.periodoA)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(item.periodoB)}
										</TableCell>
										<TableCell
											className={cn(
												"text-right tabular-nums",
												(item.variacaoPct ?? 0) >= 0
													? "text-emerald-600"
													: "text-red-600",
											)}
										>
											{formatPercent(item.variacaoPct)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

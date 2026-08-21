"use client";

import dayjs from "dayjs";
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
import { useDashboardDreAvancado } from "@/hooks/dashboard/use-dashboard-queries";
import { formatCurrency, formatPercent } from "@/lib/dashboard-periodo";
import { cn } from "@/lib/utils";

export function DreSection() {
	const agora = dayjs();
	const [granularidade, setGranularidade] = React.useState<
		"ano" | "trimestre" | "mes"
	>("mes");

	const ano = agora.year();
	const mes = agora.month() + 1;
	const trimestre = Math.floor(agora.month() / 3) + 1;

	const { data, isLoading } = useDashboardDreAvancado(granularidade, {
		ano,
		...(granularidade === "mes" ? { mes } : {}),
		...(granularidade === "trimestre" ? { trimestre } : {}),
	});

	const referenciaLabel =
		granularidade === "ano"
			? String(ano)
			: granularidade === "trimestre"
				? `${ano}-T${trimestre}`
				: agora.format("YYYY-MM");

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="text-sm text-muted-foreground">
					Referência: {referenciaLabel}
				</div>
				<Select
					value={granularidade}
					onValueChange={(v) =>
						setGranularidade(v as "ano" | "trimestre" | "mes")
					}
				>
					<SelectTrigger className="w-[180px]" size="sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ano">Ano</SelectItem>
						<SelectItem value="trimestre">Trimestre</SelectItem>
						<SelectItem value="mes">Mês</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>DRE gerencial</CardTitle>
					<CardDescription>
						Valores absolutos e percentual sobre a receita
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading || !data ? (
						<p className="text-sm text-muted-foreground">Carregando DRE…</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Indicador</TableHead>
									<TableHead className="text-right">Valor</TableHead>
									<TableHead className="text-right">% Receita</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.linhas.map((linha) => (
									<TableRow key={linha.id}>
										<TableCell
											className={cn(
												linha.nivel === 0 && "font-semibold",
												linha.nivel === 1 && "pl-6",
											)}
										>
											{linha.nome}
										</TableCell>
										<TableCell
											className={cn(
												"text-right tabular-nums",
												linha.tipo === "receita" && "text-emerald-700",
												linha.tipo === "despesa" && "text-red-700",
											)}
										>
											{formatCurrency(linha.valor)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatPercent(linha.percentualReceita)}
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

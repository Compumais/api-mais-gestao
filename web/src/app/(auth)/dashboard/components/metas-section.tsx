"use client";

import dayjs from "dayjs";
import * as React from "react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
	useCriarMetaDashboard,
	useDashboardMetasAcompanhamento,
	useExcluirMetaDashboard,
} from "@/hooks/dashboard/use-dashboard-queries";
import {
	formatCurrency,
	formatNumber,
	formatPercent,
} from "@/lib/dashboard-periodo";
import type { TipoMetaDashboard } from "@/services/dashboard.service";

const TIPOS: { value: TipoMetaDashboard; label: string }[] = [
	{ value: "faturamento", label: "Faturamento" },
	{ value: "vendas", label: "Vendas (qtd)" },
	{ value: "lucro", label: "Lucro" },
	{ value: "margem", label: "Margem %" },
	{ value: "despesas", label: "Despesas" },
];

export function MetasSection() {
	const { data, isLoading } = useDashboardMetasAcompanhamento();
	const criar = useCriarMetaDashboard();
	const excluir = useExcluirMetaDashboard();

	const [tipo, setTipo] = React.useState<TipoMetaDashboard>("faturamento");
	const [periodoInicio, setPeriodoInicio] = React.useState(
		dayjs().startOf("month").format("YYYY-MM-DD"),
	);
	const [periodoFim, setPeriodoFim] = React.useState(
		dayjs().endOf("month").format("YYYY-MM-DD"),
	);
	const [valorMeta, setValorMeta] = React.useState("");

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!valorMeta) return;
		await criar.mutateAsync({
			tipo,
			periodoInicio,
			periodoFim,
			valorMeta,
		});
		setValorMeta("");
	};

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<Card>
				<CardHeader>
					<CardTitle>Nova meta</CardTitle>
					<CardDescription>
						Defina metas de faturamento, vendas, lucro, margem ou despesas
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={onSubmit}
						className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
					>
						<label className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">Tipo</span>
							<Select
								value={tipo}
								onValueChange={(v) => setTipo(v as TipoMetaDashboard)}
							>
								<SelectTrigger size="sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TIPOS.map((t) => (
										<SelectItem key={t.value} value={t.value}>
											{t.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</label>
						<label className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">Início</span>
							<Input
								type="date"
								value={periodoInicio}
								onChange={(e) => setPeriodoInicio(e.target.value)}
							/>
						</label>
						<label className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">Fim</span>
							<Input
								type="date"
								value={periodoFim}
								onChange={(e) => setPeriodoFim(e.target.value)}
							/>
						</label>
						<label className="flex flex-col gap-1 text-xs">
							<span className="text-muted-foreground">Valor meta</span>
							<Input
								type="number"
								step="0.01"
								value={valorMeta}
								onChange={(e) => setValorMeta(e.target.value)}
								required
							/>
						</label>
						<div className="flex items-end">
							<Button type="submit" disabled={criar.isPending} className="w-full">
								Salvar meta
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Carregando metas…</p>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{(data ?? []).map((meta) => {
						const restante = Number(meta.valorMeta) - meta.valorRealizado;
						const diasTotais =
							dayjs(meta.periodoFim).diff(dayjs(meta.periodoInicio), "day") + 1;
						const diasPassados = Math.min(
							diasTotais,
							Math.max(
								1,
								dayjs().diff(dayjs(meta.periodoInicio), "day") + 1,
							),
						);
						const ritmo = meta.valorRealizado / diasPassados;
						const projecao = ritmo * diasTotais;

						return (
							<Card key={meta.id}>
								<CardHeader>
									<CardDescription>
										{TIPOS.find((t) => t.value === meta.tipo)?.label ?? meta.tipo}
									</CardDescription>
									<CardTitle className="text-lg">
										Meta {formatCurrency(Number(meta.valorMeta))}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Realizado</span>
										<span className="tabular-nums">
											{meta.tipo === "vendas"
												? formatNumber(meta.valorRealizado)
												: formatCurrency(meta.valorRealizado)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Restante</span>
										<span className="tabular-nums">
											{formatCurrency(restante)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Progresso</span>
										<span className="tabular-nums">
											{formatPercent(meta.percentualAtingido)}
										</span>
									</div>
									<p className="text-muted-foreground">
										Mantendo o ritmo atual, projeção de{" "}
										<span className="font-medium text-foreground">
											{formatCurrency(projecao)}
										</span>
										.
									</p>
									<Button
										variant="outline"
										size="sm"
										onClick={() => excluir.mutate(meta.id)}
										disabled={excluir.isPending}
									>
										Excluir
									</Button>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{(data ?? []).length === 0 && !isLoading && (
				<p className="text-sm text-muted-foreground">
					Nenhuma meta cadastrada ainda.
				</p>
			)}

			{(data ?? []).length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Acompanhamento</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Tipo</TableHead>
									<TableHead>Período</TableHead>
									<TableHead className="text-right">Meta</TableHead>
									<TableHead className="text-right">Realizado</TableHead>
									<TableHead className="text-right">%</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(data ?? []).map((meta) => (
									<TableRow key={`row-${meta.id}`}>
										<TableCell>
											{TIPOS.find((t) => t.value === meta.tipo)?.label}
										</TableCell>
										<TableCell>
											{meta.periodoInicio} → {meta.periodoFim}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(Number(meta.valorMeta))}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(meta.valorRealizado)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatPercent(meta.percentualAtingido)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

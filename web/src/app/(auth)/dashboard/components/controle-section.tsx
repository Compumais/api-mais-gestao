"use client";

import { useQuery } from "@tanstack/react-query";
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
import { useEmpresa } from "@/hooks/use-empresa";
import { dashboardService } from "@/services/dashboard.service";

const MESES = [
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

const formatCurrency = (value: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		maximumFractionDigits: 0,
	}).format(value);

export function ControleSection() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const anoAtual = new Date().getFullYear();
	const [ano, setAno] = React.useState(String(anoAtual));

	const anosDisponiveis = React.useMemo(
		() => Array.from({ length: 5 }, (_, i) => anoAtual - i),
		[anoAtual],
	);

	const { data, isLoading } = useQuery({
		queryKey: ["dashboard", "controle-plano-contas", empresa?.id, ano],
		queryFn: () =>
			dashboardService.buscarControlePlanoContas({
				idempresa: empresa?.id,
				ano: Number(ano),
			}),
		enabled: !!empresa?.id,
	});

	return (
		<div className="flex flex-col gap-4 px-4 md:gap-6 lg:px-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Controle de Plano de Contas</h2>
					<p className="text-sm text-muted-foreground">
						Despesas por plano de contas e saldo líquido mensal
					</p>
				</div>
				<Select value={ano} onValueChange={setAno}>
					<SelectTrigger className="w-[120px]">
						<SelectValue placeholder="Ano" />
					</SelectTrigger>
					<SelectContent>
						{anosDisponiveis.map((item) => (
							<SelectItem key={item} value={String(item)}>
								{item}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Despesas por Plano de Contas — {ano}</CardTitle>
					<CardDescription>
						Valores mensais por conta de despesa
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					{isLoading ? (
						<div className="flex h-48 items-center justify-center">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="sticky left-0 bg-background min-w-[200px]">
										Plano de Contas
									</TableHead>
									{MESES.map((mes) => (
										<TableHead key={mes} className="text-right min-w-[90px]">
											{mes}
										</TableHead>
									))}
									<TableHead className="text-right min-w-[100px]">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(data?.linhas ?? []).length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={14}
											className="text-center text-muted-foreground"
										>
											Nenhum lançamento encontrado
										</TableCell>
									</TableRow>
								) : (
									data?.linhas.map((linha) => (
										<TableRow key={linha.idplanocontas}>
											<TableCell className="sticky left-0 bg-background font-medium">
												{linha.codigo ? `${linha.codigo} — ` : ""}
												{linha.nome ?? "Sem nome"}
											</TableCell>
											{linha.meses.map((valor, index) => (
												<TableCell
													key={`${linha.idplanocontas}-${index}`}
													className="text-right tabular-nums text-destructive"
												>
													{valor > 0 ? formatCurrency(valor) : "—"}
												</TableCell>
											))}
											<TableCell className="text-right font-medium tabular-nums text-destructive">
												{formatCurrency(linha.total)}
											</TableCell>
										</TableRow>
									))
								)}
								<TableRow className="bg-muted/50 font-semibold">
									<TableCell className="sticky left-0 bg-muted/50">
										Saldo Líquido
									</TableCell>
									{(data?.saldoLiquidoMensal ?? Array(12).fill(0)).map(
										(valor, index) => (
											<TableCell
												key={`saldo-${index}`}
												className={`text-right tabular-nums ${valor >= 0 ? "text-green-600" : "text-destructive"}`}
											>
												{formatCurrency(valor)}
											</TableCell>
										),
									)}
									<TableCell
										className={`text-right tabular-nums ${(data?.saldoLiquidoMensal ?? []).reduce((a, b) => a + b, 0) >= 0 ? "text-green-600" : "text-destructive"}`}
									>
										{formatCurrency(
											(data?.saldoLiquidoMensal ?? []).reduce((a, b) => a + b, 0),
										)}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

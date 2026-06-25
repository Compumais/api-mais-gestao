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
import { cn } from "@/lib/utils";
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

export function DreSection() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const anoAtual = new Date().getFullYear();
	const [ano, setAno] = React.useState(String(anoAtual));

	const anosDisponiveis = React.useMemo(
		() => Array.from({ length: 5 }, (_, i) => anoAtual - i),
		[anoAtual],
	);

	const { data, isLoading } = useQuery({
		queryKey: ["dashboard", "dre", empresa?.id, ano],
		queryFn: () =>
			dashboardService.buscarDre({
				idempresa: empresa?.id,
				ano: Number(ano),
			}),
		enabled: !!empresa?.id,
	});

	return (
		<div className="flex flex-col gap-4 px-4 md:gap-6 lg:px-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">
						Demonstração do Resultado (DRE)
					</h2>
					<p className="text-sm text-muted-foreground">
						Receitas e despesas estruturadas por plano de contas
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
					<CardTitle>DRE — {ano}</CardTitle>
					<CardDescription>
						Receitas em verde, despesas em vermelho
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
									<TableHead className="sticky left-0 bg-background min-w-[240px]">
										Conta
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
											Nenhum dado encontrado
										</TableCell>
									</TableRow>
								) : (
									data?.linhas.map((linha) => (
										<TableRow
											key={linha.id}
											className={cn(
												linha.nivel === 0 && "bg-muted/30 font-semibold",
											)}
										>
											<TableCell
												className={cn(
													"sticky left-0 bg-background",
													linha.nivel === 1 && "pl-8",
													linha.nivel === 0 && "bg-muted/30 font-semibold",
													linha.tipo === "receita" && "text-green-600",
													linha.tipo === "despesa" && "text-destructive",
													linha.tipo === "resultado" &&
														(linha.total >= 0
															? "text-green-600"
															: "text-destructive"),
												)}
											>
												{linha.nome}
											</TableCell>
											{linha.meses.map((valor, index) => (
												<TableCell
													key={`${linha.id}-${index}`}
													className={cn(
														"text-right tabular-nums",
														linha.tipo === "receita" && "text-green-600",
														linha.tipo === "despesa" && "text-destructive",
														linha.tipo === "resultado" &&
															(valor >= 0
																? "text-green-600"
																: "text-destructive"),
													)}
												>
													{valor !== 0 ? formatCurrency(valor) : "—"}
												</TableCell>
											))}
											<TableCell
												className={cn(
													"text-right font-medium tabular-nums",
													linha.tipo === "receita" && "text-green-600",
													linha.tipo === "despesa" && "text-destructive",
													linha.tipo === "resultado" &&
														(linha.total >= 0
															? "text-green-600"
															: "text-destructive"),
												)}
											>
												{formatCurrency(linha.total)}
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
	);
}

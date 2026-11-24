"use client";

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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useDashboardFilters } from "@/hooks/dashboard/dashboard-filters-context";
import { useDashboardFinanceiroSaude } from "@/hooks/dashboard/use-dashboard-queries";
import {
	formatCurrency,
	formatNumber,
	formatPercent,
	limitesPeriodo,
} from "@/lib/dashboard-periodo";
import { formatDataCivilBrasilia } from "@/lib/date";
import { TopTitulosFinanceiros } from "./top-titulos-financeiros";

export function FinanceiroSection() {
	const { periodoParams } = useDashboardFilters();
	const dataFim = limitesPeriodo(periodoParams).fim;
	const { data, isLoading } = useDashboardFinanceiroSaude();
	const extratoContas = data?.extratoContas ?? [];
	const saldoFinalExtrato = extratoContas.reduce(
		(total, conta) => total + conta.saldo,
		0,
	);

	if (isLoading || !data) {
		return (
			<div className="px-4 text-sm text-muted-foreground lg:px-6">
				Carregando financeiro…
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard titulo="Receitas" valor={formatCurrency(data.receitas)} />
				<KpiCard titulo="Despesas" valor={formatCurrency(data.despesas)} />
				<KpiCard titulo="Resultado" valor={formatCurrency(data.resultado)} />
				<KpiCard
					titulo="Saldo de caixa"
					valor={formatCurrency(data.saldoAtual)}
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					titulo="Contas a receber"
					valor={formatCurrency(data.contasReceberAberto)}
				/>
				<KpiCard
					titulo="Contas a pagar"
					valor={formatCurrency(data.contasPagarAberto)}
				/>
				<KpiCard
					titulo="Vencido a receber"
					valor={formatCurrency(data.valorVencidoReceber)}
					subtitulo={`Inadimplência ${formatPercent(data.taxaInadimplenciaPct)}`}
				/>
				<KpiCard
					titulo="Vencido a pagar"
					valor={formatCurrency(data.valorVencidoPagar)}
				/>
			</div>

			<VisualErrorBoundary>
				<Card>
					<CardHeader>
						<CardTitle>Extrato</CardTitle>
						<CardDescription>
							Saldo final de cada conta corrente em{" "}
							{formatDataCivilBrasilia(dataFim)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Conta corrente</TableHead>
									<TableHead className="text-right">Saldo final</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{extratoContas.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={2}
											className="text-center text-muted-foreground"
										>
											Nenhuma conta corrente cadastrada
										</TableCell>
									</TableRow>
								) : (
									<>
										{extratoContas.map((conta) => (
											<TableRow key={conta.id}>
												<TableCell>{conta.nome}</TableCell>
												<TableCell
													className={`text-right tabular-nums ${conta.saldo < 0 ? "text-red-600" : ""}`}
												>
													{formatCurrency(conta.saldo)}
												</TableCell>
											</TableRow>
										))}
										<TableRow>
											<TableCell className="font-medium">Total</TableCell>
											<TableCell
												className={`text-right font-medium tabular-nums ${saldoFinalExtrato < 0 ? "text-red-600" : ""}`}
											>
												{formatCurrency(saldoFinalExtrato)}
											</TableCell>
										</TableRow>
									</>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</VisualErrorBoundary>

			<div className="grid gap-4 lg:grid-cols-2">
				<VisualErrorBoundary>
					<Card>
						<CardHeader>
							<CardTitle>Aging a receber</CardTitle>
							<CardDescription>Envelhecimento das contas</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Situação</TableHead>
										<TableHead className="text-right">Qtd</TableHead>
										<TableHead className="text-right">Valor</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.agingReceber.map((bucket) => (
										<TableRow key={bucket.faixa}>
											<TableCell>{bucket.faixa}</TableCell>
											<TableCell className="text-right tabular-nums">
												{formatNumber(bucket.quantidade)}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{formatCurrency(bucket.valor)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</VisualErrorBoundary>

				<VisualErrorBoundary>
					<Card>
						<CardHeader>
							<CardTitle>Aging a pagar</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Situação</TableHead>
										<TableHead className="text-right">Qtd</TableHead>
										<TableHead className="text-right">Valor</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.agingPagar.map((bucket) => (
										<TableRow key={bucket.faixa}>
											<TableCell>{bucket.faixa}</TableCell>
											<TableCell className="text-right tabular-nums">
												{formatNumber(bucket.quantidade)}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{formatCurrency(bucket.valor)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</VisualErrorBoundary>
			</div>

			<TopTitulosFinanceiros
				recebimentos={data.topRecebimentos ?? []}
				pagamentos={data.topPagamentos ?? []}
			/>

			<VisualErrorBoundary>
				<Card>
					<CardHeader>
						<CardTitle>Maiores inadimplentes</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Cliente</TableHead>
									<TableHead className="text-right">Dias</TableHead>
									<TableHead className="text-right">Valor</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.topInadimplentes.map((item, index) => (
									<TableRow key={`${item.identidade ?? "x"}-${index}`}>
										<TableCell>{item.nome}</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatNumber(item.diasAtraso)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(item.valor)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</VisualErrorBoundary>
		</div>
	);
}

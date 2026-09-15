"use client";

import { KpiCard } from "@/components/dashboard/kpi-card";
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
import { useDashboardFinanceiroSaude } from "@/hooks/dashboard/use-dashboard-queries";
import {
	formatCurrency,
	formatNumber,
	formatPercent,
} from "@/lib/dashboard-periodo";

export function FinanceiroSection() {
	const { data, isLoading } = useDashboardFinanceiroSaude();

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

			<div className="grid gap-4 lg:grid-cols-2">
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
			</div>

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
		</div>
	);
}

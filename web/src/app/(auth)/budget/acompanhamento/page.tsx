"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { TableSkeleton } from "@/components/table-skeleton";
import { MESES_BUDGET } from "@/constants/budget-constants";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type BudgetAcompanhamentoItem,
	budgetsService,
} from "@/services/budgets.service";
import { PageContainer } from "../../components/page-container";

const formatarMoeda = (valor: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(valor);

function corBarra(percentual: number) {
	if (percentual > 100) return "bg-red-500";
	if (percentual >= 80) return "bg-yellow-500";
	return "bg-emerald-500";
}

function BarraConsumo({ percentual }: { percentual: number }) {
	const largura = Math.min(100, Math.max(0, percentual));

	return (
		<div className="flex items-center gap-2">
			<div className="relative h-2 w-full min-w-24 overflow-hidden rounded-full bg-muted">
				<div
					className={`h-full transition-all ${corBarra(percentual)}`}
					style={{ width: `${largura}%` }}
				/>
			</div>
			<span
				className={`w-16 text-right text-sm font-medium ${
					percentual > 100
						? "text-red-600"
						: percentual >= 80
							? "text-yellow-600"
							: "text-muted-foreground"
				}`}
			>
				{percentual.toFixed(1)}%
			</span>
		</div>
	);
}

function badgePeriodicidade(item: BudgetAcompanhamentoItem) {
	if (item.periodicidade === "MA") {
		return <Badge variant="outline">Mensal + Anual</Badge>;
	}
	if (item.periodicidade === "A") {
		return <Badge variant="secondary">Anual</Badge>;
	}
	return <Badge variant="outline">Mensal</Badge>;
}

export default function AcompanhamentoBudgetPage() {
	const router = useRouter();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [ano, setAno] = useState(String(new Date().getFullYear()));
	const [mes, setMes] = useState<string>(String(new Date().getMonth() + 1));

	const anoNumero = Number(ano);
	const anoValido = anoNumero >= 2000 && anoNumero <= 2100;
	const mesNumero = mes === "ano" ? undefined : Number(mes);

	const { data, isLoading } = useQuery({
		queryKey: ["budgets", "acompanhamento", empresa?.id, ano, mes],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await budgetsService.acompanhamento({
				idempresa: empresa.id,
				ano: anoNumero,
				mes: mesNumero,
			});
		},
		enabled: !!empresa && anoValido,
	});

	const itens = data?.data ?? [];
	const totalLimite = itens.reduce((acc, item) => acc + item.limite, 0);
	const totalRealizado = itens.reduce((acc, item) => acc + item.realizado, 0);
	const totalSaldo = totalLimite - totalRealizado;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Acompanhamento de Budget</h1>
					<Button
						variant="outline"
						onClick={() => router.push("/budget")}
						className="gap-2"
					>
						<IconArrowLeft className="size-4" />
						Voltar para Budgets
					</Button>
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar o acompanhamento
							</p>
						</div>
					) : (
						<>
							<div className="p-4 border-b">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Input
										type="number"
										min={2000}
										max={2100}
										placeholder="Ano..."
										value={ano}
										onChange={(e) => setAno(e.target.value)}
										aria-label="Ano de referência"
									/>
									<Select value={mes} onValueChange={setMes}>
										<SelectTrigger
											aria-label="Mês de referência"
											className="w-full"
										>
											<SelectValue placeholder="Mês" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="ano">Ano inteiro</SelectItem>
											{MESES_BUDGET.map((m) => (
												<SelectItem key={m.valor} value={String(m.valor)}>
													{m.nome}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							{itens.length > 0 && (
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-b">
									<div className="rounded-lg border p-4">
										<p className="text-sm text-muted-foreground">
											Limite total
										</p>
										<p className="text-xl font-semibold">
											{formatarMoeda(totalLimite)}
										</p>
									</div>
									<div className="rounded-lg border p-4">
										<p className="text-sm text-muted-foreground">
											Gasto realizado
										</p>
										<p className="text-xl font-semibold">
											{formatarMoeda(totalRealizado)}
										</p>
									</div>
									<div className="rounded-lg border p-4">
										<p className="text-sm text-muted-foreground">
											Saldo disponível
										</p>
										<p
											className={`text-xl font-semibold ${
												totalSaldo < 0 ? "text-red-600" : "text-emerald-600"
											}`}
										>
											{formatarMoeda(totalSaldo)}
										</p>
									</div>
								</div>
							)}
							{isLoading ? (
								<TableSkeleton rows={6} columns={6}>
									<TableCell>Plano de contas</TableCell>
									<TableCell className="w-28">Periodicidade</TableCell>
									<TableCell className="w-32">Limite</TableCell>
									<TableCell className="w-32">Realizado</TableCell>
									<TableCell className="w-32">Saldo</TableCell>
									<TableCell className="w-48">Consumo</TableCell>
								</TableSkeleton>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Plano de contas</TableHead>
											<TableHead>Periodicidade</TableHead>
											<TableHead className="text-right">Limite</TableHead>
											<TableHead className="text-right">Realizado</TableHead>
											<TableHead className="text-right">Saldo</TableHead>
											<TableHead className="w-56">Consumo</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{itens.length ? (
											itens.map((item) => (
												<TableRow key={item.idplanocontas}>
													<TableCell>
														{item.planocontascodigo
															? `${item.planocontascodigo} - `
															: ""}
														{item.planocontasnome ?? item.idplanocontas}
													</TableCell>
													<TableCell>{badgePeriodicidade(item)}</TableCell>
													<TableCell className="text-right">
														{formatarMoeda(item.limite)}
													</TableCell>
													<TableCell className="text-right">
														{formatarMoeda(item.realizado)}
													</TableCell>
													<TableCell
														className={`text-right font-medium ${
															item.saldo < 0 ? "text-red-600" : ""
														}`}
													>
														{formatarMoeda(item.saldo)}
													</TableCell>
													<TableCell>
														<BarraConsumo percentual={item.percentual} />
													</TableCell>
												</TableRow>
											))
										) : (
											<TableRow>
												<TableCell colSpan={6} className="h-24 text-center">
													Nenhum budget cadastrado para o período selecionado.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							)}
						</>
					)}
				</div>
			</div>
		</PageContainer>
	);
}

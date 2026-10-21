"use client";

import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TableSkeleton } from "@/components/table-skeleton";
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
import { MESES_BUDGET } from "@/constants/budget-constants";
import {
	REGIME_APROPRIACAO_OPTIONS,
	type RegimeApropriacao,
} from "@/constants/centro-custo-constants";
import { useEmpresa } from "@/hooks/use-empresa";
import { budgetsCentroCustoService } from "@/services/budgets-centro-custo.service";
import { PageContainer } from "../components/page-container";

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
			<span className="w-16 text-right text-sm font-medium">
				{percentual.toFixed(1)}%
			</span>
		</div>
	);
}

export default function OrcamentoCentroCustosPage() {
	const router = useRouter();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [ano, setAno] = useState(String(new Date().getFullYear()));
	const [mes, setMes] = useState<string>(String(new Date().getMonth() + 1));
	const [regime, setRegime] = useState<RegimeApropriacao>("competencia");

	const anoNumero = Number(ano);
	const anoValido = anoNumero >= 2000 && anoNumero <= 2100;
	const mesNumero = mes === "ano" ? undefined : Number(mes);

	const { data, isLoading } = useQuery({
		queryKey: [
			"budgets-centro-custo",
			"acompanhamento",
			empresa?.id,
			ano,
			mes,
			regime,
		],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return budgetsCentroCustoService.acompanhamento({
				idempresa: empresa.id,
				ano: anoNumero,
				mes: mesNumero,
				regime,
			});
		},
		enabled: !!empresa && anoValido,
	});

	const itens = data?.data ?? [];

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-2 px-4">
					<h1 className="text-2xl font-bold">Orçamento por centro de custo</h1>
					<div className="flex gap-2">
						<Button
							className="gap-2"
							onClick={() => router.push("/orcamento-centro-custos/novo")}
						>
							<IconPlus className="size-4" />
							Novo orçamento
						</Button>
					</div>
				</div>

				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<p className="text-center text-muted-foreground py-8">
							Selecione uma empresa
						</p>
					) : (
						<>
							<div className="p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-4">
								<Input
									type="number"
									min={2000}
									max={2100}
									value={ano}
									onChange={(e) => setAno(e.target.value)}
									aria-label="Ano"
								/>
								<Select value={mes} onValueChange={setMes}>
									<SelectTrigger aria-label="Mês">
										<SelectValue />
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
								<Select
									value={regime}
									onValueChange={(v) => setRegime(v as RegimeApropriacao)}
								>
									<SelectTrigger aria-label="Regime">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{REGIME_APROPRIACAO_OPTIONS.map((r) => (
											<SelectItem key={r.value} value={r.value}>
												{r.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{isLoading ? (
								<TableSkeleton rows={6} columns={6}>
									<TableCell>Centro de custo</TableCell>
									<TableCell>Plano de contas</TableCell>
									<TableCell>Limite</TableCell>
									<TableCell>Realizado</TableCell>
									<TableCell>Saldo</TableCell>
									<TableCell>Consumo</TableCell>
								</TableSkeleton>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Centro de custo</TableHead>
											<TableHead>Plano de contas</TableHead>
											<TableHead className="text-right">Limite</TableHead>
											<TableHead className="text-right">Realizado</TableHead>
											<TableHead className="text-right">Saldo</TableHead>
											<TableHead className="w-56">Execução</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{itens.length ? (
											itens.map((item) => (
												<TableRow
													key={`${item.idcentrocusto}-${item.idplanocontas ?? ""}`}
												>
													<TableCell>
														{item.centrocustocodigo
															? `${item.centrocustocodigo} - `
															: ""}
														{item.centrocustonome}
													</TableCell>
													<TableCell>
														{item.idplanocontas ? (
															<>
																{item.planocontascodigo
																	? `${item.planocontascodigo} - `
																	: ""}
																{item.planocontasnome ?? item.idplanocontas}
															</>
														) : (
															<Badge variant="outline">Geral</Badge>
														)}
													</TableCell>
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
														<BarraConsumo
															percentual={item.percentualExecucao}
														/>
													</TableCell>
												</TableRow>
											))
										) : (
											<TableRow>
												<TableCell colSpan={6} className="h-24 text-center">
													Nenhum orçamento para o período selecionado.
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

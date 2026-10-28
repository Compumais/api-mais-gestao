"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inicioFimMesBrasilia } from "@/lib/date";
import {
	type PontoCompraVenda,
	type PontoEstoque,
	type PontoPrecoCusto,
	produtoAnalyticsService,
} from "@/services/produto-analytics.service";
import type { Produto } from "@/services/produtos.service";

type AbaGrafico = "preco-custo" | "compra-venda" | "estoque";

type GraficosProdutoModalProps = {
	produto: Produto | null;
	idempresa: string;
	onFechar: () => void;
};

const chartConfigPrecoCusto = {
	precoVenda: { label: "Preço de venda", color: "var(--chart-1)" },
	custo: { label: "Custo", color: "var(--chart-2)" },
} satisfies ChartConfig;

const chartConfigCompraVenda = {
	compra: { label: "Compras", color: "var(--chart-1)" },
	venda: { label: "Vendas", color: "var(--chart-2)" },
} satisfies ChartConfig;

const chartConfigEstoque = {
	saldo: { label: "Saldo", color: "var(--chart-1)" },
	entrada: { label: "Entradas", color: "var(--chart-2)" },
	saida: { label: "Saídas", color: "var(--chart-3)" },
} satisfies ChartConfig;

function formatarDataCurta(data: string) {
	const [ano, mes, dia] = data.split("-");
	if (!ano || !mes || !dia) return data;
	return `${dia}/${mes}`;
}

function formatarMoeda(valor: number) {
	return valor.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}

function formatarQtd(valor: number) {
	return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function mensagemErroConsulta(erro: unknown, padrao: string): string {
	if (erro instanceof Error && erro.message.trim()) {
		return erro.message;
	}
	return padrao;
}

function EmptyState({ mensagem }: { mensagem: string }) {
	return (
		<div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
			{mensagem}
		</div>
	);
}

function LoadingState() {
	return (
		<div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
			Carregando gráfico…
		</div>
	);
}

export function GraficosProdutoModal({
	produto,
	idempresa,
	onFechar,
}: GraficosProdutoModalProps) {
	const aberto = !!produto;
	const { inicio, fim } = inicioFimMesBrasilia();

	const [aba, setAba] = useState<AbaGrafico>("preco-custo");
	const [dataInicio, setDataInicio] = useState(inicio);
	const [dataFim, setDataFim] = useState(fim);
	const [granularidade, setGranularidade] = useState<"dia" | "semana" | "mes">(
		"dia",
	);
	const [tipoEstoque, setTipoEstoque] = useState("0");
	const [filtrosAplicados, setFiltrosAplicados] = useState({
		dataInicio: inicio,
		dataFim: fim,
		granularidade: "dia" as "dia" | "semana" | "mes",
		tipoEstoque: 0,
	});

	useEffect(() => {
		if (!aberto || !produto?.id) return;
		const padrao = inicioFimMesBrasilia();
		setAba("preco-custo");
		setDataInicio(padrao.inicio);
		setDataFim(padrao.fim);
		setGranularidade("dia");
		setTipoEstoque("0");
		setFiltrosAplicados({
			dataInicio: padrao.inicio,
			dataFim: padrao.fim,
			granularidade: "dia",
			tipoEstoque: 0,
		});
	}, [aberto, produto?.id]);

	const aplicarFiltros = () => {
		if (!dataInicio || !dataFim) return;
		if (dataInicio > dataFim) return;
		setFiltrosAplicados({
			dataInicio,
			dataFim,
			granularidade,
			tipoEstoque: Number(tipoEstoque) || 0,
		});
	};

	const queryKeyBase = useMemo(
		() => [
			"produto-analytics",
			idempresa,
			produto?.id,
			filtrosAplicados.dataInicio,
			filtrosAplicados.dataFim,
		],
		[
			idempresa,
			produto?.id,
			filtrosAplicados.dataInicio,
			filtrosAplicados.dataFim,
		],
	);

	const precoCustoQuery = useQuery({
		queryKey: [...queryKeyBase, "preco-custo"],
		queryFn: async () => {
			if (!produto?.id) throw new Error("Produto não informado");
			return produtoAnalyticsService.precoCusto(produto.id, {
				idempresa,
				dataInicio: filtrosAplicados.dataInicio,
				dataFim: filtrosAplicados.dataFim,
			});
		},
		enabled: aberto && !!produto?.id && aba === "preco-custo",
	});

	const compraVendaQuery = useQuery({
		queryKey: [
			...queryKeyBase,
			"compra-venda",
			filtrosAplicados.granularidade,
		],
		queryFn: async () => {
			if (!produto?.id) throw new Error("Produto não informado");
			return produtoAnalyticsService.compraVenda(produto.id, {
				idempresa,
				dataInicio: filtrosAplicados.dataInicio,
				dataFim: filtrosAplicados.dataFim,
				granularidade: filtrosAplicados.granularidade,
			});
		},
		enabled: aberto && !!produto?.id && aba === "compra-venda",
	});

	const estoqueQuery = useQuery({
		queryKey: [...queryKeyBase, "estoque", filtrosAplicados.tipoEstoque],
		queryFn: async () => {
			if (!produto?.id) throw new Error("Produto não informado");
			return produtoAnalyticsService.estoque(produto.id, {
				idempresa,
				dataInicio: filtrosAplicados.dataInicio,
				dataFim: filtrosAplicados.dataFim,
				tipoEstoque: filtrosAplicados.tipoEstoque,
			});
		},
		enabled: aberto && !!produto?.id && aba === "estoque",
	});

	const pontosPrecoCusto = useMemo(
		() =>
			(precoCustoQuery.data?.pontos ?? []).map((p: PontoPrecoCusto) => ({
				...p,
				label: formatarDataCurta(p.data),
			})),
		[precoCustoQuery.data],
	);

	const pontosCompraVenda = useMemo(
		() =>
			(compraVendaQuery.data?.pontos ?? []).map((p: PontoCompraVenda) => ({
				...p,
				label: formatarDataCurta(p.data),
			})),
		[compraVendaQuery.data],
	);

	const pontosEstoque = useMemo(
		() =>
			(estoqueQuery.data?.pontos ?? []).map((p: PontoEstoque) => ({
				...p,
				label: formatarDataCurta(p.data),
			})),
		[estoqueQuery.data],
	);

	const titulo = produto
		? `${produto.codigo ? `${produto.codigo} — ` : ""}${produto.nome}`
		: "Gráficos do produto";

	return (
		<Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
			<DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Gráficos analíticos</DialogTitle>
					<DialogDescription>{titulo}</DialogDescription>
				</DialogHeader>

				<FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<Field>
						<FieldLabel htmlFor="graf-data-inicio">Data inicial</FieldLabel>
						<Input
							id="graf-data-inicio"
							type="date"
							value={dataInicio}
							onChange={(e) => setDataInicio(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="graf-data-fim">Data final</FieldLabel>
						<Input
							id="graf-data-fim"
							type="date"
							value={dataFim}
							onChange={(e) => setDataFim(e.target.value)}
						/>
					</Field>
					{aba === "compra-venda" ? (
						<Field>
							<FieldLabel>Granularidade</FieldLabel>
							<Select
								value={granularidade}
								onValueChange={(v) =>
									setGranularidade(v as "dia" | "semana" | "mes")
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="dia">Dia</SelectItem>
									<SelectItem value="semana">Semana</SelectItem>
									<SelectItem value="mes">Mês</SelectItem>
								</SelectContent>
							</Select>
						</Field>
					) : null}
					{aba === "estoque" ? (
						<Field>
							<FieldLabel>Tipo de estoque</FieldLabel>
							<Select value={tipoEstoque} onValueChange={setTipoEstoque}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">Operacional</SelectItem>
									<SelectItem value="1">Fiscal</SelectItem>
								</SelectContent>
							</Select>
						</Field>
					) : null}
					<div className="flex items-end">
						<Button type="button" onClick={aplicarFiltros} className="w-full">
							Aplicar filtros
						</Button>
					</div>
				</FieldGroup>

				<Tabs
					value={aba}
					onValueChange={(v) => setAba(v as AbaGrafico)}
					className="mt-4"
				>
					<TabsList className="w-full flex-wrap h-auto">
						<TabsTrigger value="preco-custo">Preço × Custo</TabsTrigger>
						<TabsTrigger value="compra-venda">Compra × Vendas</TabsTrigger>
						<TabsTrigger value="estoque">Posição de estoque</TabsTrigger>
					</TabsList>

					<TabsContent value="preco-custo" className="mt-4">
						{precoCustoQuery.isLoading ? (
							<LoadingState />
						) : precoCustoQuery.isError ? (
							<EmptyState
								mensagem={mensagemErroConsulta(
									precoCustoQuery.error,
									"Não foi possível carregar o gráfico de preço × custo.",
								)}
							/>
						) : pontosPrecoCusto.length === 0 ? (
							<EmptyState mensagem="Sem dados de preço ou custo no período." />
						) : (
							<ChartContainer
								config={chartConfigPrecoCusto}
								className="h-[320px] w-full"
							>
								<LineChart data={pontosPrecoCusto}>
									<CartesianGrid vertical={false} />
									<XAxis dataKey="label" tickLine={false} axisLine={false} />
									<YAxis
										tickLine={false}
										axisLine={false}
										width={72}
										tickFormatter={(v) => formatarMoeda(Number(v))}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												formatter={(valor, nome) => (
													<span>
														{nome === "precoVenda" ? "Preço" : "Custo"}:{" "}
														{formatarMoeda(Number(valor))}
													</span>
												)}
											/>
										}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="precoVenda"
										name="Preço de venda"
										stroke="var(--color-precoVenda)"
										dot={false}
										strokeWidth={2}
										connectNulls
									/>
									<Line
										type="monotone"
										dataKey="custo"
										name="Custo"
										stroke="var(--color-custo)"
										dot={false}
										strokeWidth={2}
										connectNulls
									/>
								</LineChart>
							</ChartContainer>
						)}
					</TabsContent>

					<TabsContent value="compra-venda" className="mt-4">
						{compraVendaQuery.isLoading ? (
							<LoadingState />
						) : compraVendaQuery.isError ? (
							<EmptyState
								mensagem={mensagemErroConsulta(
									compraVendaQuery.error,
									"Não foi possível carregar o gráfico de compra × vendas.",
								)}
							/>
						) : pontosCompraVenda.length === 0 ? (
							<EmptyState mensagem="Sem movimentações de compra ou venda no período." />
						) : (
							<ChartContainer
								config={chartConfigCompraVenda}
								className="h-[320px] w-full"
							>
								<LineChart data={pontosCompraVenda}>
									<CartesianGrid vertical={false} />
									<XAxis dataKey="label" tickLine={false} axisLine={false} />
									<YAxis
										tickLine={false}
										axisLine={false}
										width={56}
										tickFormatter={(v) => formatarQtd(Number(v))}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												formatter={(valor, nome) => (
													<span>
														{nome === "compra" ? "Compras" : "Vendas"}:{" "}
														{formatarQtd(Number(valor))}
													</span>
												)}
											/>
										}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="compra"
										name="Compras"
										stroke="var(--color-compra)"
										dot={false}
										strokeWidth={2}
									/>
									<Line
										type="monotone"
										dataKey="venda"
										name="Vendas"
										stroke="var(--color-venda)"
										dot={false}
										strokeWidth={2}
									/>
								</LineChart>
							</ChartContainer>
						)}
					</TabsContent>

					<TabsContent value="estoque" className="mt-4">
						{estoqueQuery.isLoading ? (
							<LoadingState />
						) : estoqueQuery.isError ? (
							<EmptyState
								mensagem={mensagemErroConsulta(
									estoqueQuery.error,
									"Não foi possível carregar o gráfico de estoque.",
								)}
							/>
						) : pontosEstoque.length === 0 ? (
							<EmptyState mensagem="Sem posição de estoque no período." />
						) : (
							<ChartContainer
								config={chartConfigEstoque}
								className="h-[320px] w-full"
							>
								<LineChart data={pontosEstoque}>
									<CartesianGrid vertical={false} />
									<XAxis dataKey="label" tickLine={false} axisLine={false} />
									<YAxis
										tickLine={false}
										axisLine={false}
										width={56}
										tickFormatter={(v) => formatarQtd(Number(v))}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												formatter={(valor, nome) => (
													<span>
														{nome === "saldo"
															? "Saldo"
															: nome === "entrada"
																? "Entradas"
																: "Saídas"}
														: {formatarQtd(Number(valor))}
													</span>
												)}
											/>
										}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="saldo"
										name="Saldo"
										stroke="var(--color-saldo)"
										dot={false}
										strokeWidth={2}
									/>
									<Line
										type="monotone"
										dataKey="entrada"
										name="Entradas"
										stroke="var(--color-entrada)"
										dot={false}
										strokeWidth={1.5}
										strokeDasharray="4 4"
									/>
									<Line
										type="monotone"
										dataKey="saida"
										name="Saídas"
										stroke="var(--color-saida)"
										dot={false}
										strokeWidth={1.5}
										strokeDasharray="4 4"
									/>
								</LineChart>
							</ChartContainer>
						)}
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}

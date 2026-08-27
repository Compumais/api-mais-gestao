"use client";

import { IconChevronDown, IconLayoutColumns } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useCallback, useId, useMemo, useState } from "react";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	TABELA_ESTOQUE,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	estoqueGestaoService,
	type SaldoEstoqueGestao,
} from "@/services/estoque-gestao.service";
import { PageContainer } from "../components/page-container";
import { AjusteEstoqueDialog } from "./components/ajuste-estoque-dialog";
import { LotesProdutoEstoque } from "./components/lotes-produto-estoque";
import {
	COLUNA_PARA_CAMPO_FILTRO_ESTOQUE,
	type ConfigFiltroColunaEstoque,
	criarColunasEstoque,
	DIVERGENCIA_OPCOES_FILTRO,
	type FiltrosColunaEstoqueState,
	filtrosColunaEstoqueVazios,
	visibilidadePadraoColunasEstoque,
} from "./estoque-colunas";

function formatarQuantidade(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "0";
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

const TIPO_ESTOQUE_LABEL: Record<number, string> = {
	0: "Operacional",
	1: "Fiscal",
	2: "Ambos",
};

function rotuloColuna(column: {
	id: string;
	columnDef: { meta?: unknown; header?: unknown };
}) {
	const meta = column.columnDef.meta as { label?: string } | undefined;
	if (meta?.label) return meta.label;
	if (typeof column.columnDef.header === "string") {
		return column.columnDef.header;
	}
	return column.id;
}

function filtrosColunaAtivos(filtros: FiltrosColunaEstoqueState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function EstoquePage() {
	const queryClient = useQueryClient();
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const idPorPagina = useId();
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	});
	const [filtrosColuna, setFiltrosColuna] = useState<FiltrosColunaEstoqueState>(
		filtrosColunaEstoqueVazios,
	);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
	const [produtoSelecionado, setProdutoSelecionado] =
		useState<SaldoEstoqueGestao | null>(null);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [ajusteAberto, setAjusteAberto] = useState(false);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasEstoque(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_ESTOQUE, visibilidadePadrao);

	const onOrdenarColuna = useCallback(
		(colunaId: string, direcao: OrdenacaoColunaTabela) => {
			if (!direcao) {
				setOrdenarPor(null);
				setOrdem(null);
			} else {
				setOrdenarPor(colunaId);
				setOrdem(direcao);
			}
			setPagination((p) => ({ ...p, pageIndex: 0 }));
		},
		[],
	);

	const onFiltrarColuna = useCallback((colunaId: string, valor: string) => {
		const campo = COLUNA_PARA_CAMPO_FILTRO_ESTOQUE[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaEstoque
	> => {
		return {
			codigo: { tipo: "texto", placeholder: "Código" },
			nome: { tipo: "texto", placeholder: "Produto" },
			quantidade: { tipo: "nenhum" },
			quantidadefiscal: { tipo: "nenhum" },
			divergencia: {
				tipo: "opcoes",
				opcoes: DIVERGENCIA_OPCOES_FILTRO,
			},
			ncm: { tipo: "texto", placeholder: "NCM" },
			unidademedida: { tipo: "texto", placeholder: "Unidade" },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"estoque-saldos",
			idempresa,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: () =>
			estoqueGestaoService.listarSaldos({
				idempresa,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.codigoproduto
					? { codigoproduto: filtrosColuna.codigoproduto }
					: {}),
				...(filtrosColuna.nomeproduto
					? { nomeproduto: filtrosColuna.nomeproduto }
					: {}),
				...(filtrosColuna.ncm ? { ncm: filtrosColuna.ncm } : {}),
				...(filtrosColuna.unidademedida
					? { unidademedida: filtrosColuna.unidademedida }
					: {}),
				...(filtrosColuna.divergencia === "com"
					? { somenteDivergencia: true }
					: filtrosColuna.divergencia === "sem"
						? { somenteDivergencia: false }
						: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			}),
		enabled: !!idempresa,
	});

	const { data: movimentosData, isLoading: carregandoMovimentos } = useQuery({
		queryKey: [
			"estoque-movimentos",
			idempresa,
			produtoSelecionado?.codigoproduto,
		],
		queryFn: () =>
			estoqueGestaoService.listarMovimentos({
				idempresa,
				codigoproduto: produtoSelecionado?.codigoproduto ?? undefined,
				page: 1,
				limit: 50,
			}),
		enabled: !!idempresa && !!produtoSelecionado?.codigoproduto,
	});

	const columns = useMemo(
		() =>
			criarColunasEstoque({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderSelectHeader: (table) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label="Selecionar todos"
					/>
				),
				renderSelectCell: (row) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Selecionar linha"
					/>
				),
				renderAcoes: (saldo) => (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setProdutoSelecionado(saldo)}
					>
						Movimentos
					</Button>
				),
			}),
		[
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
		],
	);

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		state: {
			pagination,
			columnVisibility,
			rowSelection,
		},
		onPaginationChange: setPagination,
		onColumnVisibilityChange,
		onRowSelectionChange: setRowSelection,
		enableRowSelection: true,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.idproduto,
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const produtosSelecionados = table
		.getSelectedRowModel()
		.rows.map((row) => row.original);
	const colunasVisiveis = table.getVisibleLeafColumns();
	const mostrarSkeleton = isLoading || isLoadingPreferencias;
	const comFiltros = filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold">Estoque</h1>
						<p className="text-muted-foreground text-sm mt-1">
							Todos os produtos cadastrados com saldo operacional e fiscal para
							validação de divergências
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm">
									<IconLayoutColumns className="size-4" />
									<span className="hidden lg:inline">Personalizar Colunas</span>
									<span className="lg:hidden">Colunas</span>
									<IconChevronDown className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="max-h-72 w-56 overflow-y-auto"
							>
								{table
									.getAllColumns()
									.filter((column) => column.getCanHide())
									.map((column) => (
										<DropdownMenuCheckboxItem
											key={column.id}
											checked={column.getIsVisible()}
											onCheckedChange={(value) =>
												column.toggleVisibility(!!value)
											}
										>
											{rotuloColuna(column)}
										</DropdownMenuCheckboxItem>
									))}
							</DropdownMenuContent>
						</DropdownMenu>
						<Button type="button" onClick={() => setAjusteAberto(true)}>
							Ajuste de estoque
							{produtosSelecionados.length > 0
								? ` (${produtosSelecionados.length})`
								: ""}
						</Button>
					</div>
				</div>

				<div className="mx-4 rounded-lg border bg-card">
					{mostrarSkeleton ? (
						<TableSkeleton columns={colunasVisiveis.length || 7} rows={8}>
							{colunasVisiveis.map((coluna) => (
								<TableHead
									key={coluna.id}
									className={
										coluna.id === "select"
											? "w-10"
											: coluna.id === "acoes"
												? "w-12"
												: undefined
									}
								>
									{rotuloColuna(coluna)}
								</TableHead>
							))}
						</TableSkeleton>
					) : (
						<>
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<TableHead
													key={header.id}
													className={
														header.id === "select"
															? "w-10"
															: header.id === "acoes"
																? "w-28"
																: undefined
													}
												>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
												</TableHead>
											))}
										</TableRow>
									))}
								</TableHeader>
								<TableBody>
									{table.getRowModel().rows.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={colunasVisiveis.length}
												className="h-24 text-center"
											>
												{comFiltros
													? "Nenhum produto encontrado para os filtros selecionados."
													: "Nenhum produto encontrado"}
											</TableCell>
										</TableRow>
									) : (
										table.getRowModel().rows.map((row) => (
											<TableRow
												key={row.id}
												data-state={row.getIsSelected() && "selected"}
											>
												{row.getVisibleCells().map((cell) => (
													<TableCell key={cell.id}>
														{flexRender(
															cell.column.columnDef.cell,
															cell.getContext(),
														)}
													</TableCell>
												))}
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
							{data && data.paginacao.total > 0 && (
								<div className="flex flex-col gap-4 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-center gap-2">
										<Label htmlFor={idPorPagina} className="text-sm">
											Itens por página
										</Label>
										<Select
											value={`${pagination.pageSize}`}
											onValueChange={(value) => {
												table.setPageSize(Number(value));
												table.setPageIndex(0);
											}}
										>
											<SelectTrigger id={idPorPagina} className="h-8 w-[72px]">
												<SelectValue placeholder={pagination.pageSize} />
											</SelectTrigger>
											<SelectContent side="top">
												{[10, 20, 30, 50, 100].map((tamanho) => (
													<SelectItem key={tamanho} value={`${tamanho}`}>
														{tamanho}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="text-sm text-muted-foreground">
										Página {pagination.pageIndex + 1} de{" "}
										{data.paginacao.totalPages} ({data.paginacao.total}{" "}
										registros)
										{produtosSelecionados.length > 0
											? ` · ${produtosSelecionados.length} selecionado(s)`
											: ""}
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => table.previousPage()}
											disabled={!table.getCanPreviousPage()}
										>
											Anterior
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => table.nextPage()}
											disabled={!table.getCanNextPage()}
										>
											Próxima
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>

				<Sheet
					open={!!produtoSelecionado}
					onOpenChange={(open) => !open && setProdutoSelecionado(null)}
				>
					<SheetContent className="sm:max-w-lg overflow-y-auto">
						<SheetHeader>
							<SheetTitle>{produtoSelecionado?.nomeproduto}</SheetTitle>
							<SheetDescription>
								Código {produtoSelecionado?.codigoproduto ?? "-"} · Histórico de
								movimentos (últimos registros da empresa)
							</SheetDescription>
						</SheetHeader>

						<div className="mt-6 space-y-6">
							<LotesProdutoEstoque
								idempresa={idempresa}
								codigoproduto={produtoSelecionado?.codigoproduto}
							/>

							<div className="space-y-3">
								<h3 className="text-sm font-semibold">Movimentos</h3>
								{carregandoMovimentos ? (
									<p className="text-sm text-muted-foreground">Carregando...</p>
								) : (
									(movimentosData?.data ?? []).map((mov) => (
										<div key={mov.id} className="rounded border p-3 text-sm">
											<div className="flex items-center gap-2 justify-between">
												<span className="font-medium">
													{mov.quantidadesaida
														? `Saída ${formatarQuantidade(mov.quantidadesaida)}`
														: `Entrada ${formatarQuantidade(mov.quantidadeentrada)}`}
												</span>
												<Badge variant="outline">
													{TIPO_ESTOQUE_LABEL[mov.tipoestoque ?? 0] ?? "—"}
												</Badge>
											</div>
											<p className="text-muted-foreground mt-1">
												{mov.datahora ?? mov.data ?? "—"}
											</p>
										</div>
									))
								)}
							</div>
						</div>
					</SheetContent>
				</Sheet>

				<AjusteEstoqueDialog
					aberto={ajusteAberto}
					onAbertoChange={setAjusteAberto}
					idempresa={idempresa}
					produtosIniciais={produtosSelecionados}
					onSucesso={() => {
						setRowSelection({});
						void queryClient.invalidateQueries({ queryKey: ["estoque-saldos"] });
						void queryClient.invalidateQueries({
							queryKey: ["estoque-movimentos"],
						});
						void queryClient.invalidateQueries({ queryKey: ["estoque-lotes"] });
					}}
				/>
			</div>
		</PageContainer>
	);
}

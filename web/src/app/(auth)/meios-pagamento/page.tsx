"use client";

import {
	IconChevronDown,
	IconDotsVertical,
	IconLayoutColumns,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	TABELA_CONDICOES_PAGAMENTO,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type CondicaoPagamento,
	condicaoPagamentoService,
} from "@/services/condicao-pagamento.service";
import { PageContainer } from "../components/page-container";
import { BandeirasCartaoTab } from "./components/bandeiras-cartao-tab";
import { FormasErpTab } from "./components/formas-erp-tab";
import {
	COLUNA_PARA_CAMPO_FILTRO_CONDICAO_PAGAMENTO,
	type ConfigFiltroColunaCondicaoPagamento,
	criarColunasCondicoesPagamento,
	ESCOPO_OPCOES_FILTRO,
	type FiltrosColunaCondicoesPagamentoState,
	filtrosColunaCondicoesPagamentoVazios,
	STATUS_OPCOES_FILTRO,
	visibilidadePadraoColunasCondicoesPagamento,
} from "./condicoes-pagamento-colunas";

const ROTA_BASE = "/meios-pagamento";

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

function filtrosColunaAtivos(filtros: FiltrosColunaCondicoesPagamentoState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function MeiosPagamentoPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const idPorPagina = useId();
	const [busca, setBusca] = useState("");
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaCondicoesPagamentoState>(
			filtrosColunaCondicoesPagamentoVazios,
		);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasCondicoesPagamento(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_CONDICOES_PAGAMENTO, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_CONDICAO_PAGAMENTO[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaCondicaoPagamento
	> => {
		const texto = (
			placeholder?: string,
		): ConfigFiltroColunaCondicaoPagamento => ({
			tipo: "texto",
			placeholder,
		});
		return {
			codigo: texto("Ex: 01"),
			descricao: texto("Descrição"),
			parcelas: texto("Parcelas"),
			prazos: texto("Prazos"),
			escopo: {
				tipo: "opcoes",
				opcoes: ESCOPO_OPCOES_FILTRO,
			},
			status: {
				tipo: "opcoes",
				opcoes: STATUS_OPCOES_FILTRO,
			},
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"meios-pagamento",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			busca,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await condicaoPagamentoService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(busca.trim() ? { descricao: busca.trim() } : {}),
				...(filtrosColuna.codigo ? { codigo: filtrosColuna.codigo } : {}),
				...(filtrosColuna.descricao
					? { descricao: filtrosColuna.descricao }
					: {}),
				...(filtrosColuna.parcelas
					? { parcelas: filtrosColuna.parcelas }
					: {}),
				...(filtrosColuna.prazos ? { prazos: filtrosColuna.prazos } : {}),
				...(filtrosColuna.escopo !== ""
					? { escopo: Number(filtrosColuna.escopo) }
					: {}),
				...(filtrosColuna.inativo !== ""
					? { inativo: Number(filtrosColuna.inativo) }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletar } = useMutation({
		mutationFn: condicaoPagamentoService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meios-pagamento"] });
			toast.success("Meio de pagamento excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir meio de pagamento");
		},
	});

	const handleEdit = useCallback(
		(registro: CondicaoPagamento) => {
			router.push(`${ROTA_BASE}/${registro.id}/editar`);
		},
		[router],
	);

	const handleDelete = useCallback(
		(id: string) => {
			toast.message("Tem certeza que deseja excluir este meio de pagamento?", {
				position: "top-center",
				duration: 3000,
				action: {
					label: "Excluir",
					onClick: () => deletar(id),
				},
				description: "Esta ação não pode ser desfeita.",
			});
		},
		[deletar],
	);

	const columns = useMemo(
		() =>
			criarColunasCondicoesPagamento({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderAcoes: (registro) => (
					<div className="flex justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									aria-label="Abrir menu de ações"
								>
									<IconDotsVertical className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => handleEdit(registro)}>
									<IconPencil className="size-4" />
									Editar
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() => handleDelete(registro.id)}
								>
									<IconTrash className="size-4" />
									Excluir
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				),
			}),
		[
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
			handleEdit,
			handleDelete,
		],
	);

	const table = useReactTable({
		data: data?.data || [],
		columns,
		state: {
			pagination,
			columnVisibility,
		},
		onPaginationChange: setPagination,
		onColumnVisibilityChange,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const colunasVisiveis = table.getVisibleLeafColumns();
	const mostrarSkeleton = isLoading || isLoadingPreferencias;
	const comFiltros =
		!!busca.trim() || filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Meios de pagamento</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Condições de parcelamento, formas usadas na NF-e e bandeiras de
						cartão do PDV.
					</p>
				</div>

				<Tabs defaultValue="condicoes" className="px-4">
					<TabsList>
						<TabsTrigger value="condicoes">Condições de pagamento</TabsTrigger>
						<TabsTrigger value="formas-erp">Formas ERP (NF-e)</TabsTrigger>
						<TabsTrigger value="bandeiras">Bandeiras de cartão</TabsTrigger>
					</TabsList>

					<TabsContent value="condicoes" className="mt-4 space-y-4">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<h2 className="text-lg font-semibold">Condições de pagamento</h2>
							<Button
								onClick={() => router.push(`${ROTA_BASE}/novo`)}
								className="gap-2"
								disabled={!localStorageEmpresa}
							>
								<IconPlus className="size-4" />
								Cadastrar condição
							</Button>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-2">
							<Input
								placeholder="Buscar por descrição..."
								value={busca}
								onChange={(event) => {
									setBusca(event.target.value);
									setPagination((prev) => ({ ...prev, pageIndex: 0 }));
								}}
								className="max-w-sm"
								aria-label="Buscar meios de pagamento por descrição"
							/>
							{localStorageEmpresa && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm">
											<IconLayoutColumns className="size-4" />
											<span className="hidden lg:inline">
												Personalizar Colunas
											</span>
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
							)}
						</div>

						<div className="rounded-lg border bg-card">
							{!localStorageEmpresa ? (
								<div className="flex items-center justify-center py-8">
									<p className="text-muted-foreground">
										Selecione uma empresa para visualizar os meios de pagamento
									</p>
								</div>
							) : mostrarSkeleton ? (
								<TableSkeleton
									columns={colunasVisiveis.length || 7}
									rows={10}
								>
									{colunasVisiveis.map((coluna) => (
										<TableHead
											key={coluna.id}
											className={
												coluna.id === "acoes" ? "w-12 text-end" : undefined
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
															className={
																header.id === "acoes" ? "text-right" : ""
															}
															key={header.id}
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
											{table.getRowModel().rows?.length ? (
												table.getRowModel().rows.map((row) => (
													<TableRow key={row.id}>
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
											) : (
												<TableRow>
													<TableCell
														colSpan={colunasVisiveis.length}
														className="h-24 text-center"
													>
														{comFiltros
															? "Nenhum meio de pagamento encontrado para os filtros selecionados."
															: "Nenhum meio de pagamento encontrado."}
													</TableCell>
												</TableRow>
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
													<SelectTrigger
														id={idPorPagina}
														className="h-8 w-[72px]"
													>
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
					</TabsContent>

					<TabsContent value="formas-erp" className="mt-4">
						<FormasErpTab />
					</TabsContent>

					<TabsContent value="bandeiras" className="mt-4">
						<BandeirasCartaoTab />
					</TabsContent>
				</Tabs>
			</div>
		</PageContainer>
	);
}

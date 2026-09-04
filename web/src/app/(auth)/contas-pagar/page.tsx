"use client";

import {
	IconCheck,
	IconChevronDown,
	IconDotsVertical,
	IconEye,
	IconLayoutColumns,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { ModalBaixaFinanceiro } from "@/components/modal-baixa-financeiro";
import { TableSkeleton } from "@/components/table-skeleton";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	TABELA_CONTAS_PAGAR,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type Financeiro,
	financeiroService,
} from "@/services/financeiro.service";
import {
	COLUNA_PARA_CAMPO_FILTRO_FINANCEIRO,
	type ConfigFiltroColunaFinanceiro,
	criarColunasFinanceiro,
	type FiltrosColunaFinanceiroState,
	filtrosColunaFinanceiroVazios,
	podeDarBaixa,
	STATUS_OPCOES_FILTRO,
	visibilidadePadraoColunasFinanceiro,
} from "../components/financeiro-lista-colunas";
import { PageContainer } from "../components/page-container";

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

function filtrosColunaAtivos(filtros: FiltrosColunaFinanceiroState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function ContasAPagarPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const idPorPagina = useId();
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaFinanceiroState>(filtrosColunaFinanceiroVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [financeiroToDelete, setFinanceiroToDelete] = useState<string | null>(
		null,
	);
	const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
	const [idsParaBaixa, setIdsParaBaixa] = useState<string[]>([]);
	const [baixando, setBaixando] = useState(false);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasFinanceiro("pagar"),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_CONTAS_PAGAR, visibilidadePadrao);

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
			setRowSelection({});
		},
		[],
	);

	const onFiltrarColuna = useCallback((colunaId: string, valor: string) => {
		const campo = COLUNA_PARA_CAMPO_FILTRO_FINANCEIRO[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
		setRowSelection({});
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaFinanceiro
	> => {
		return {
			documento: { tipo: "texto", placeholder: "Documento" },
			tipodocumento: { tipo: "texto", placeholder: "Tipo de documento" },
			emitente: { tipo: "texto", placeholder: "Nome" },
			parcela: { tipo: "nenhum" },
			status: { tipo: "opcoes", opcoes: STATUS_OPCOES_FILTRO },
			emissao: { tipo: "data" },
			vencimento: { tipo: "data" },
			valor: { tipo: "nenhum" },
			saldo: { tipo: "nenhum" },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"financeiro",
			"contas-pagar",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await financeiroService.listar({
				tipo: "P",
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.documento
					? { documento: filtrosColuna.documento }
					: {}),
				...(filtrosColuna.tipodocumentodescricao
					? { tipodocumentodescricao: filtrosColuna.tipodocumentodescricao }
					: {}),
				...(filtrosColuna.emitente
					? { emitente: filtrosColuna.emitente }
					: {}),
				...(filtrosColuna.status ? { status: filtrosColuna.status } : {}),
				...(filtrosColuna.emissao
					? {
							emissaoInicio: filtrosColuna.emissao,
							emissaoFim: filtrosColuna.emissao,
						}
					: {}),
				...(filtrosColuna.vencimento
					? {
							vencimentoInicio: filtrosColuna.vencimento,
							vencimentoFim: filtrosColuna.vencimento,
						}
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!empresa,
	});

	const deleteMutation = useMutation({
		mutationFn: financeiroService.deletar,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["financeiro"] });
			toast.success("Conta a pagar excluída com sucesso!");
			setDeleteDialogOpen(false);
			setFinanceiroToDelete(null);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir conta a pagar");
		},
	});

	const handleEdit = useCallback(
		(financeiro: Financeiro) => {
			router.push(`/contas-pagar/${financeiro.id}/editar`);
		},
		[router],
	);

	const handleDelete = useCallback((id: string) => {
		setFinanceiroToDelete(id);
		setDeleteDialogOpen(true);
	}, []);

	const handleConfirmDelete = () => {
		if (financeiroToDelete) {
			deleteMutation.mutate(financeiroToDelete);
		}
	};

	const handleAbrirBaixa = (ids: string[]) => {
		if (ids.length === 0) return;
		setIdsParaBaixa(ids);
		setBaixaDialogOpen(true);
	};

	const handleDarBaixa = useCallback((id: string) => {
		handleAbrirBaixa([id]);
	}, []);

	const handleConfirmBaixa = async (dataBaixa: string) => {
		setBaixando(true);
		let ok = 0;
		let falhas = 0;

		for (const id of idsParaBaixa) {
			try {
				await financeiroService.darBaixa(id, dataBaixa);
				ok += 1;
			} catch {
				falhas += 1;
			}
		}

		setBaixando(false);
		setBaixaDialogOpen(false);
		setIdsParaBaixa([]);
		setRowSelection({});
		void queryClient.invalidateQueries({ queryKey: ["financeiro"] });

		if (ok > 0) {
			toast.success(
				ok === 1
					? "Baixa realizada com sucesso!"
					: `${ok} baixas realizadas com sucesso!`,
			);
		}
		if (falhas > 0) {
			toast.error(
				falhas === 1
					? "Falha ao dar baixa em 1 documento"
					: `Falha ao dar baixa em ${falhas} documentos`,
			);
		}
	};

	const handleVerDetalhes = useCallback(
		(id: string) => {
			router.push(`/contas-pagar/${id}`);
		},
		[router],
	);

	const columns = useMemo(
		() =>
			criarColunasFinanceiro({
				variante: "pagar",
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
						disabled={!row.getCanSelect()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Selecionar documento"
					/>
				),
				renderAcoes: (financeiro) => {
					const podeExcluir =
						financeiro.status === "A" && !financeiro.pagamento;
					const podeBaixar = podeDarBaixa(financeiro);

					return (
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
									<DropdownMenuItem
										onClick={() => handleVerDetalhes(financeiro.id)}
									>
										<IconEye className="size-4 mr-2" />
										Ver detalhes
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => handleEdit(financeiro)}>
										<IconPencil className="size-4 mr-2" />
										Editar
									</DropdownMenuItem>
									{podeBaixar && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={() => handleDarBaixa(financeiro.id)}
											>
												<IconCheck className="size-4 mr-2" />
												Dar baixa
											</DropdownMenuItem>
										</>
									)}
									{podeExcluir && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												variant="destructive"
												onClick={() => handleDelete(financeiro.id)}
											>
												<IconTrash className="size-4 mr-2" />
												Excluir
											</DropdownMenuItem>
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				},
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
			handleDarBaixa,
			handleVerDetalhes,
		],
	);

	const table = useReactTable({
		data: data?.data || [],
		columns,
		state: {
			pagination,
			columnVisibility,
			rowSelection,
		},
		onPaginationChange: setPagination,
		onColumnVisibilityChange,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
		enableRowSelection: (row) => podeDarBaixa(row.original),
		getRowId: (row) => row.id,
	});

	const idsSelecionados = Object.keys(rowSelection).filter(
		(id) => rowSelection[id],
	);
	const colunasVisiveis = table.getVisibleLeafColumns();
	const mostrarSkeleton = isLoading || isLoadingPreferencias;
	const comFiltros = filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isInputFocused =
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement;

			if (isInputFocused) return;

			if (event.key === "F2") {
				event.preventDefault();
				router.push("/contas-pagar/novo");
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [router]);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-2 px-4">
					<h1 className="text-2xl font-bold">Contas a Pagar</h1>
					<div className="flex flex-wrap gap-2">
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
						{idsSelecionados.length > 0 && (
							<Button
								onClick={() => handleAbrirBaixa(idsSelecionados)}
								className="gap-2"
							>
								<IconCheck className="size-4" />
								Dar baixa ({idsSelecionados.length})
							</Button>
						)}
						<Button
							disabled={!empresa}
							onClick={() => router.push("/contas-pagar/novo")}
							className="gap-2"
						>
							<IconPlus className="size-4" />
							Incluir (F2)
						</Button>
					</div>
				</div>

				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as contas a pagar
							</p>
						</div>
					) : mostrarSkeleton ? (
						<TableSkeleton
							rows={10}
							columns={colunasVisiveis.length || 10}
						>
							{colunasVisiveis.map((coluna) => (
								<TableHead key={coluna.id}>{rotuloColuna(coluna)}</TableHead>
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
														header.id === "valor" || header.id === "saldo"
															? "text-right"
															: header.id === "acoes"
																? "text-right"
																: ""
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
									) : (
										<TableRow>
											<TableCell
												colSpan={colunasVisiveis.length}
												className="h-24 text-center"
											>
												{comFiltros
													? "Nenhuma conta a pagar encontrada para os filtros selecionados."
													: "Nenhuma conta a pagar encontrada."}
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
			</div>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir conta a pagar</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja excluir esta conta a pagar? Esta ação não
							pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? "Excluindo..." : "Excluir"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<ModalBaixaFinanceiro
				open={baixaDialogOpen}
				onOpenChange={setBaixaDialogOpen}
				quantidade={idsParaBaixa.length}
				onConfirm={handleConfirmBaixa}
				isPending={baixando}
			/>
		</PageContainer>
	);
}

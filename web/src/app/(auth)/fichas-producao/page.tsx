"use client";

import {
	IconBuildingFactory,
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
import { PageContainer } from "@/app/(auth)/components/page-container";
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
	TABELA_FICHAS_PRODUCAO,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type FichaProducao,
	fichaProducaoService,
} from "@/services/ficha-producao.service";
import { ProduzirFichaDialog } from "./components/produzir-ficha-dialog";
import {
	COLUNA_PARA_CAMPO_FILTRO_FICHA_PRODUCAO,
	type ConfigFiltroColunaFichaProducao,
	criarColunasFichasProducao,
	type FiltrosColunaFichasProducaoState,
	filtrosColunaFichasProducaoVazios,
	MODOS_OPCOES_FILTRO,
	STATUS_OPCOES_FILTRO,
	visibilidadePadraoColunasFichasProducao,
} from "./fichas-producao-colunas";

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

function filtrosColunaAtivos(filtros: FiltrosColunaFichasProducaoState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function FichasProducaoPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const idPorPagina = useId();
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaFichasProducaoState>(
			filtrosColunaFichasProducaoVazios,
		);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
	const [fichaProduzir, setFichaProduzir] = useState<FichaProducao | null>(
		null,
	);
	const [dialogAberto, setDialogAberto] = useState(false);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasFichasProducao(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_FICHAS_PRODUCAO, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_FICHA_PRODUCAO[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaFichaProducao
	> => {
		return {
			codigo: { tipo: "texto", placeholder: "Código" },
			nome: { tipo: "texto", placeholder: "Produto" },
			modos: {
				tipo: "opcoes",
				opcoes: MODOS_OPCOES_FILTRO,
			},
			status: {
				tipo: "opcoes",
				opcoes: STATUS_OPCOES_FILTRO,
			},
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"fichas-producao",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return fichaProducaoService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.codigo ? { codigo: filtrosColuna.codigo } : {}),
				...(filtrosColuna.nome ? { nome: filtrosColuna.nome } : {}),
				...(filtrosColuna.ativo !== ""
					? { ativo: Number(filtrosColuna.ativo) }
					: {}),
				...(filtrosColuna.modo === "massa"
					? { permiteproducaomassa: 1 }
					: filtrosColuna.modo === "venda"
						? { producaonavenda: 1 }
						: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!localStorageEmpresa?.id,
	});

	const { mutate: excluir } = useMutation({
		mutationFn: fichaProducaoService.deletar,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["fichas-producao"] });
			toast.success("Ficha excluída");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir");
		},
	});

	const abrirProducao = useCallback(async (ficha: FichaProducao) => {
		try {
			const completa = await fichaProducaoService.buscar(ficha.id);
			setFichaProduzir(completa);
			setDialogAberto(true);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Falha ao carregar ficha",
			);
		}
	}, []);

	const columns = useMemo(
		() =>
			criarColunasFichasProducao({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderAcoes: (ficha) => (
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
								{ficha.permiteproducaomassa === 1 && ficha.ativo === 1 && (
									<DropdownMenuItem onClick={() => void abrirProducao(ficha)}>
										<IconBuildingFactory className="size-4" />
										Produzir
									</DropdownMenuItem>
								)}
								<DropdownMenuItem
									onClick={() =>
										router.push(`/fichas-producao/${ficha.id}/editar`)
									}
								>
									<IconPencil className="size-4" />
									Editar
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() => {
										if (confirm("Excluir esta ficha de produção?")) {
											excluir(ficha.id);
										}
									}}
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
			abrirProducao,
			router,
			excluir,
		],
	);

	const table = useReactTable({
		data: data?.data ?? [],
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
	const comFiltros = filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-2 px-4">
					<h1 className="text-2xl font-bold">Fichas de produção</h1>
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
						<Button onClick={() => router.push("/fichas-producao/novo")}>
							<IconPlus className="size-4" />
							Nova ficha
						</Button>
					</div>
				</div>

				<div className="mx-4 rounded-lg border bg-card">
					{mostrarSkeleton ? (
						<TableSkeleton columns={colunasVisiveis.length || 5} rows={8}>
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
													key={header.id}
													className={
														header.id === "acoes" ? "w-12 text-right" : ""
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
													? "Nenhuma ficha encontrada para os filtros selecionados."
													: "Nenhuma ficha encontrada"}
											</TableCell>
										</TableRow>
									) : (
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

			<ProduzirFichaDialog
				aberto={dialogAberto}
				onAbertoChange={setDialogAberto}
				ficha={fichaProduzir}
			/>
		</PageContainer>
	);
}

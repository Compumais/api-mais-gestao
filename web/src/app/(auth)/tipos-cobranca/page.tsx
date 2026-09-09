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
	TABELA_TIPOS_COBRANCA,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type TipoCobranca,
	tipoCobrancaService,
} from "@/services/tipo-cobranca.service";
import { tipoDocumentoFinanceiroService } from "@/services/tipo-documento-financeiro.service";
import { PageContainer } from "../components/page-container";
import {
	COLUNA_PARA_CAMPO_FILTRO_TIPO_COBRANCA,
	type ConfigFiltroColunaTipoCobranca,
	criarColunasTiposCobranca,
	type FiltrosColunaTiposCobrancaState,
	filtrosColunaTiposCobrancaVazios,
	visibilidadePadraoColunasTiposCobranca,
} from "./tipos-cobranca-colunas";

const ROTA_BASE = "/tipos-cobranca";

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

function filtrosColunaAtivos(filtros: FiltrosColunaTiposCobrancaState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function TiposCobrancaPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const idPorPagina = useId();
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaTiposCobrancaState>(filtrosColunaTiposCobrancaVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasTiposCobranca(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_TIPOS_COBRANCA, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_TIPO_COBRANCA[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const { data: tiposDocumento = [] } = useQuery({
		queryKey: ["tipos-documento-financeiro", localStorageEmpresa?.id, "todos"],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await tipoDocumentoFinanceiroService.listarTodos({
				idempresa: localStorageEmpresa.id,
				inativo: 0,
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const mapaTipoDocumento = useMemo(() => {
		const mapa: Record<string, string> = {};
		for (const tipo of tiposDocumento) {
			mapa[tipo.id] = tipo.descricao;
		}
		return mapa;
	}, [tiposDocumento]);

	const opcoesTipoDocumento = useMemo(
		() =>
			tiposDocumento.map((tipo) => ({
				value: tipo.id,
				label: tipo.descricao,
			})),
		[tiposDocumento],
	);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaTipoCobranca
	> => {
		return {
			codigo: { tipo: "texto", placeholder: "Código" },
			descricao: { tipo: "texto", placeholder: "Descrição" },
			tipodocumento: {
				tipo: "opcoes",
				opcoes: opcoesTipoDocumento,
			},
		};
	}, [opcoesTipoDocumento]);

	const { data, isLoading } = useQuery({
		queryKey: [
			"tipos-cobranca",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await tipoCobrancaService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.descricao
					? { descricao: filtrosColuna.descricao }
					: {}),
				...(filtrosColuna.codigo ? { codigo: filtrosColuna.codigo } : {}),
				...(filtrosColuna.idtipodocumentofinanceiro
					? {
							idtipodocumentofinanceiro:
								filtrosColuna.idtipodocumentofinanceiro,
						}
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletar } = useMutation({
		mutationFn: tipoCobrancaService.deletar,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["tipos-cobranca"] });
			toast.success("Tipo de cobrança excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir tipo de cobrança");
		},
	});

	const handleEdit = useCallback(
		(registro: TipoCobranca) => {
			router.push(`${ROTA_BASE}/${registro.id}/editar`);
		},
		[router],
	);

	const handleDelete = useCallback(
		(id: string) => {
			toast.message("Tem certeza que deseja excluir este tipo de cobrança?", {
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
			criarColunasTiposCobranca({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				mapaTipoDocumento,
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
			mapaTipoDocumento,
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
	const comFiltros = filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold">Tipos de cobrança</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Cadastre os tipos de cobrança usados no financeiro.
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
						<Button
							onClick={() => router.push(`${ROTA_BASE}/novo`)}
							className="gap-2"
							disabled={!localStorageEmpresa}
						>
							<IconPlus className="size-4" />
							Novo tipo de cobrança
						</Button>
					</div>
				</div>

				<div className="mx-4 rounded-lg border bg-card">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os tipos de cobrança
							</p>
						</div>
					) : mostrarSkeleton ? (
						<TableSkeleton columns={colunasVisiveis.length || 4} rows={10}>
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
														header.id === "acoes" ? "w-12 text-right" : ""
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
													? "Nenhum tipo de cobrança encontrado para os filtros selecionados."
													: "Nenhum tipo de cobrança encontrado."}
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
		</PageContainer>
	);
}

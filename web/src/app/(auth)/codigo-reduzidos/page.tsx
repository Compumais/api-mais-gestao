"use client";

import {
	IconChevronDown,
	IconDotsVertical,
	IconLayoutColumns,
	IconPencil,
	IconPlus,
	IconSearch,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
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
import { useContaContabil } from "@/hooks/use-conta-contabil";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	TABELA_CODIGOS_REDUZIDOS,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type ContaContabil,
	contaContabilService,
	type SituacaoCodigoReduzido,
} from "@/services/conta-contabil.service";
import { PageContainer } from "../components/page-container";
import {
	COLUNA_PARA_CAMPO_FILTRO_CODIGOS_REDUZIDOS,
	type ConfigFiltroColunaCodigosReduzidos,
	criarColunasCodigosReduzidos,
	type FiltrosColunaCodigosReduzidosState,
	filtrosColunaCodigosReduzidosVazios,
	INATIVO_OPCOES_FILTRO,
	NATUREZA_OPCOES_FILTRO,
	SITUACAO_CODIGO_OPCOES_FILTRO,
	TIPO_CONTA_OPCOES_FILTRO,
	visibilidadePadraoColunasCodigosReduzidos,
} from "./codigo-reduzidos-colunas";
import { DialogCodigoReduzido } from "./components/dialog-codigo-reduzido";

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

function filtrosColunaAtivos(filtros: FiltrosColunaCodigosReduzidosState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

function temCodigoReduzido(conta: ContaContabil) {
	return !!conta.codigoreduzido?.trim();
}

export default function CodigosReduzidosPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const idPorPagina = useId();
	const qAplicado = searchParams.get("q")?.trim() ?? "";
	const [qInput, setQInput] = useState(qAplicado);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaCodigosReduzidosState>(
			filtrosColunaCodigosReduzidosVazios,
		);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
	const [dialogAberto, setDialogAberto] = useState(false);
	const [contaEdicao, setContaEdicao] = useState<ContaContabil | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasCodigosReduzidos(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_CODIGOS_REDUZIDOS, visibilidadePadrao);

	useEffect(() => {
		setQInput(qAplicado);
	}, [qAplicado]);

	const handleBuscar = () => {
		const termo = qInput.trim();
		setPagination((p) => ({ ...p, pageIndex: 0 }));
		const params = new URLSearchParams();
		if (termo) params.set("q", termo);
		const query = params.toString();
		router.replace(query ? `/codigo-reduzidos?${query}` : "/codigo-reduzidos");
	};

	const abrirInclusao = useCallback(() => {
		setContaEdicao(null);
		setDialogAberto(true);
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isInputFocused =
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement;

			if (isInputFocused) return;

			if (event.key === "F2") {
				event.preventDefault();
				abrirInclusao();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [abrirInclusao]);

	const onOrdenarColuna = useCallback(
		(colunaId: string, direcao: OrdenacaoColunaTabela) => {
			if (!direcao) {
				setOrdenarPor(null);
				setOrdem(null);
			} else {
				setOrdenarPor(colunaId === "situacao" ? "codigoreduzido" : colunaId);
				setOrdem(direcao);
			}
			setPagination((p) => ({ ...p, pageIndex: 0 }));
		},
		[],
	);

	const onFiltrarColuna = useCallback((colunaId: string, valor: string) => {
		const campo = COLUNA_PARA_CAMPO_FILTRO_CODIGOS_REDUZIDOS[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaCodigosReduzidos
	> => {
		const texto = (placeholder?: string): ConfigFiltroColunaCodigosReduzidos => ({
			tipo: "texto",
			placeholder,
		});
		return {
			codigoreduzido: texto("Ex: 101"),
			descricao: texto("Nome da conta"),
			codigoextenso: texto("Ex: 2.1.01"),
			natureza: {
				tipo: "opcoes",
				opcoes: NATUREZA_OPCOES_FILTRO,
			},
			tipocontacontabil: {
				tipo: "opcoes",
				opcoes: TIPO_CONTA_OPCOES_FILTRO,
			},
			situacao: {
				tipo: "opcoes",
				opcoes: SITUACAO_CODIGO_OPCOES_FILTRO,
			},
			inativo: {
				tipo: "opcoes",
				opcoes: INATIVO_OPCOES_FILTRO,
			},
		};
	}, []);

	const { data, isLoading } = useContaContabil({
		idempresa: localStorageEmpresa?.id,
		q: qAplicado || undefined,
		codigoreduzido: filtrosColuna.codigoreduzido || undefined,
		descricao: filtrosColuna.descricao || undefined,
		codigoextenso: filtrosColuna.codigoextenso || undefined,
		natureza: filtrosColuna.natureza || undefined,
		tipocontacontabil: filtrosColuna.tipocontacontabil || undefined,
		inativo:
			filtrosColuna.inativo !== "" ? Number(filtrosColuna.inativo) : undefined,
		situacaoCodigo:
			filtrosColuna.situacaoCodigo === "com" ||
			filtrosColuna.situacaoCodigo === "sem"
				? (filtrosColuna.situacaoCodigo as SituacaoCodigoReduzido)
				: undefined,
		ordenarPor,
		ordem,
		page: pagination.pageIndex + 1,
		limit: pagination.pageSize,
	});

	const { mutate: limparCodigo } = useMutation({
		mutationFn: (id: string) =>
			contaContabilService.atualizar(id, { codigoreduzido: null }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["conta-contabil"] });
			toast.success("Código reduzido desvinculado da conta");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao desvincular código reduzido");
		},
	});

	const handleEdit = useCallback((conta: ContaContabil) => {
		setContaEdicao(conta);
		setDialogAberto(true);
	}, []);

	const handleDelete = useCallback(
		(conta: ContaContabil) => {
			if (!temCodigoReduzido(conta)) {
				toast.error("Esta conta ainda não possui código reduzido");
				return;
			}
			toast.message("Desvincular o código reduzido desta conta?", {
				position: "top-center",
				duration: 3000,
				action: {
					label: "Desvincular",
					onClick: () => limparCodigo(conta.id),
				},
				description:
					"A conta contábil permanece cadastrada. Apenas o código é removido.",
			});
		},
		[limparCodigo],
	);

	const columns = useMemo(
		() =>
			criarColunasCodigosReduzidos({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderAcoes: (conta) => (
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
								<DropdownMenuItem onClick={() => handleEdit(conta)}>
									<IconPencil className="size-4" />
									{temCodigoReduzido(conta) ? "Editar código" : "Vincular código"}
								</DropdownMenuItem>
								{temCodigoReduzido(conta) ? (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											variant="destructive"
											onClick={() => handleDelete(conta)}
										>
											<IconTrash className="size-4" />
											Desvincular
										</DropdownMenuItem>
									</>
								) : null}
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
		!!qAplicado || filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<div>
						<h1 className="text-2xl font-bold">Códigos reduzidos</h1>
						<p className="text-sm text-muted-foreground">
							Vincule e consulte os códigos reduzidos das contas contábeis
						</p>
					</div>
					<Button
						onClick={abrirInclusao}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Vincular (F2)
					</Button>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2 px-4">
					<div className="flex gap-2">
						<Input
							value={qInput}
							onChange={(event) => setQInput(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") handleBuscar();
							}}
							placeholder="Buscar por código, conta ou código extenso..."
							disabled={!localStorageEmpresa}
							className="max-w-md"
						/>
						<Button
							onClick={handleBuscar}
							disabled={!localStorageEmpresa}
							className="gap-2"
						>
							<IconSearch className="size-4" />
							Buscar
						</Button>
					</div>
					{localStorageEmpresa && (
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
					)}
				</div>
				<div className="mx-4 rounded-lg border bg-card">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os códigos reduzidos
							</p>
						</div>
					) : mostrarSkeleton ? (
						<TableSkeleton columns={colunasVisiveis.length || 6} rows={10}>
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
													className={header.id === "acoes" ? "text-right" : ""}
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
												className="cursor-pointer"
												onClick={() => handleEdit(row.original)}
											>
												{row.getVisibleCells().map((cell) => (
													<TableCell
														key={cell.id}
														onClick={
															cell.column.id === "acoes"
																? (event) => event.stopPropagation()
																: undefined
														}
													>
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
													? "Nenhum código reduzido encontrado para os filtros selecionados."
													: "Nenhuma conta contábil encontrada. Cadastre contas em Plano de contas contábeis."}
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
			<DialogCodigoReduzido
				aberto={dialogAberto}
				conta={contaEdicao}
				onAbertoChange={setDialogAberto}
				onSalvo={() => {
					queryClient.invalidateQueries({ queryKey: ["conta-contabil"] });
				}}
			/>
		</PageContainer>
	);
}

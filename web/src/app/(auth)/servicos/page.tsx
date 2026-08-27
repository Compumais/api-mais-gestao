"use client";

import {
	IconBan,
	IconCheck,
	IconChevronDown,
	IconDotsVertical,
	IconLayoutColumns,
	IconPencil,
	IconPlus,
	IconSearch,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	TABELA_SERVICOS,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import { type Produto, produtosService } from "@/services/produtos.service";
import { PageContainer } from "../components/page-container";
import {
	COLUNA_PARA_CAMPO_FILTRO_SERVICO,
	type ConfigFiltroColunaServico,
	criarColunasServicos,
	type FiltrosColunaServicosState,
	filtrosColunaServicosVazios,
	visibilidadePadraoColunasServicos,
} from "./servicos-colunas";

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

function filtrosColunaAtivos(filtros: FiltrosColunaServicosState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function ServicosPage() {
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
		useState<FiltrosColunaServicosState>(filtrosColunaServicosVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasServicos(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_SERVICOS, visibilidadePadrao);

	useEffect(() => {
		setQInput(qAplicado);
	}, [qAplicado]);

	const handleBuscar = () => {
		const termo = qInput.trim();
		setPagination((p) => ({ ...p, pageIndex: 0 }));
		const params = new URLSearchParams();
		if (termo) params.set("q", termo);
		const query = params.toString();
		router.replace(query ? `/servicos?${query}` : "/servicos");
	};

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_SERVICO[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaServico
	> => {
		const texto = (placeholder?: string): ConfigFiltroColunaServico => ({
			tipo: "texto",
			placeholder,
		});
		return {
			codigo: texto("Ex: 123"),
			nome: texto("Nome do serviço"),
			preco: texto("Preço"),
			inativo: {
				tipo: "opcoes",
				opcoes: [
					{ value: "0", label: "Ativo" },
					{ value: "1", label: "Inativo" },
				],
			},
			referencia: texto("Referência"),
			unidademedida: texto("Unidade"),
			tipoproduto: texto("Tipo"),
			custoaquisicao: texto("Custo"),
			datacadastro: { tipo: "data" },
			codigolistalc11603: texto("LC 116"),
			codigonbs: texto("NBS"),
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"servicos",
			localStorageEmpresa?.id,
			qAplicado,
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
			return await produtosService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				tipo: "S",
				...(qAplicado ? { q: qAplicado } : {}),
				...(filtrosColuna.nome ? { nome: filtrosColuna.nome } : {}),
				...(filtrosColuna.inativo !== ""
					? { inativo: Number(filtrosColuna.inativo) }
					: {}),
				...(filtrosColuna.codigo ? { codigo: filtrosColuna.codigo } : {}),
				...(filtrosColuna.referencia
					? { referencia: filtrosColuna.referencia }
					: {}),
				...(filtrosColuna.unidademedida
					? { unidademedida: filtrosColuna.unidademedida }
					: {}),
				...(filtrosColuna.tipoproduto
					? { tipoproduto: filtrosColuna.tipoproduto }
					: {}),
				...(filtrosColuna.preco ? { preco: filtrosColuna.preco } : {}),
				...(filtrosColuna.custoaquisicao
					? { custoaquisicao: filtrosColuna.custoaquisicao }
					: {}),
				...(filtrosColuna.datacadastro
					? { datacadastro: filtrosColuna.datacadastro }
					: {}),
				...(filtrosColuna.codigolistalc11603
					? { codigolistalc11603: filtrosColuna.codigolistalc11603 }
					: {}),
				...(filtrosColuna.codigonbs
					? { codigonbs: filtrosColuna.codigonbs }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletarServico } = useMutation({
		mutationFn: async ({ id, idempresa }: { id: string; idempresa: string }) =>
			produtosService.deletar(id, idempresa),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["servicos"] });
			queryClient.invalidateQueries({ queryKey: ["produtos"] });
			toast.success("Serviço excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir serviço");
		},
	});

	const { mutate: alterarSituacao } = useMutation({
		mutationFn: async ({
			id,
			inativo,
			idempresa,
		}: {
			id: string;
			inativo: number;
			idempresa: string;
		}) => produtosService.inativar(id, inativo, idempresa),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["servicos"] });
			queryClient.invalidateQueries({ queryKey: ["produtos"] });
			toast.success(
				variables.inativo === 1
					? "Serviço inativado com sucesso!"
					: "Serviço reativado com sucesso!",
			);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao alterar situação do serviço");
		},
	});

	const handleEdit = useCallback(
		(servico: Produto) => {
			router.push(`/servicos/${servico.id}/editar`);
		},
		[router],
	);

	const handleDelete = useCallback(
		(id: string) => {
			if (!localStorageEmpresa) {
				toast.error("Empresa não selecionada");
				return;
			}
			toast.message("Tem certeza que deseja excluir este serviço?", {
				position: "top-center",
				duration: 3000,
				action: {
					label: "Excluir",
					onClick: () =>
						deletarServico({ id, idempresa: localStorageEmpresa.id }),
				},
				description: "Esta ação não pode ser desfeita.",
			});
		},
		[deletarServico, localStorageEmpresa],
	);

	const handleToggleInativo = useCallback(
		(servico: Produto) => {
			if (!localStorageEmpresa) {
				toast.error("Empresa não selecionada");
				return;
			}
			const novoInativo = servico.inativo === 1 ? 0 : 1;
			const acao = novoInativo === 1 ? "inativar" : "reativar";
			toast.message(`Tem certeza que deseja ${acao} este serviço?`, {
				position: "top-center",
				duration: 3000,
				action: {
					label: novoInativo === 1 ? "Inativar" : "Reativar",
					onClick: () =>
						alterarSituacao({
							id: servico.id,
							inativo: novoInativo,
							idempresa: localStorageEmpresa.id,
						}),
				},
			});
		},
		[alterarSituacao, localStorageEmpresa],
	);

	const columns = useMemo(
		() =>
			criarColunasServicos({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderAcoes: (servico) => {
					const inativo = servico.inativo === 1;
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
									<DropdownMenuItem onClick={() => handleEdit(servico)}>
										<IconPencil className="size-4" />
										Editar
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => handleToggleInativo(servico)}
									>
										{inativo ? (
											<>
												<IconCheck className="size-4" />
												Reativar
											</>
										) : (
											<>
												<IconBan className="size-4" />
												Inativar
											</>
										)}
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										variant="destructive"
										onClick={() => handleDelete(servico.id)}
									>
										<IconTrash className="size-4" />
										Excluir
									</DropdownMenuItem>
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
			handleToggleInativo,
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
					<h1 className="text-2xl font-bold">Serviços</h1>
					<Button
						onClick={() => router.push("/servicos/novo")}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Incluir Novo Serviço
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
							placeholder="Buscar por nome, código ou preço..."
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
								Selecione uma empresa para visualizar os serviços
							</p>
						</div>
					) : mostrarSkeleton ? (
						<TableSkeleton columns={colunasVisiveis.length || 5} rows={10}>
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
													? "Nenhum serviço encontrado para os filtros selecionados."
													: "Nenhum serviço encontrado."}
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

"use client";

import {
	IconBan,
	IconCalculator,
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
	type RowSelectionState,
	useReactTable,
} from "@tanstack/react-table";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlterarProdutosEmMassaDialog } from "@/app/(auth)/produtos/components/alterar-produtos-em-massa-dialog";
import { ImportarProdutosDialog } from "@/app/(auth)/produtos/components/importar-produtos-dialog";
import { ModalComposicaoPrecoProduto } from "@/app/(auth)/produtos/components/modal-composicao-preco-produto";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { TableSkeleton } from "@/components/table-skeleton";
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
	TABELA_PRODUTOS,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type FormatoImportacaoProdutos,
	type Produto,
	produtosService,
} from "@/services/produtos.service";
import { PageContainer } from "../components/page-container";
import {
	COLUNA_PARA_CAMPO_FILTRO_PRODUTO,
	type ConfigFiltroColunaProduto,
	criarColunasProdutos,
	type FiltrosColunaProdutosState,
	filtrosColunaProdutosVazios,
	visibilidadePadraoColunasProdutos,
} from "./produtos-colunas";

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

function filtrosColunaAtivos(filtros: FiltrosColunaProdutosState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function ProdutosPage() {
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
	const [formatoImportacao, setFormatoImportacao] =
		useState<FormatoImportacaoProdutos | null>(null);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [dialogAlteracaoAberto, setDialogAlteracaoAberto] = useState(false);
	const [produtoComposicao, setProdutoComposicao] = useState<Produto | null>(
		null,
	);
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaProdutosState>(filtrosColunaProdutosVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasProdutos(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_PRODUTOS, visibilidadePadrao);

	useEffect(() => {
		setQInput(qAplicado);
	}, [qAplicado]);

	const empresaId = localStorageEmpresa?.id;
	// biome-ignore lint/correctness/useExhaustiveDependencies: limpa a seleção ao mudar busca ou empresa
	useEffect(() => {
		setRowSelection({});
	}, [qAplicado, empresaId, filtrosColuna, ordenarPor, ordem]);

	const handleBuscar = () => {
		const termo = qInput.trim();
		setPagination((p) => ({ ...p, pageIndex: 0 }));

		const params = new URLSearchParams();
		if (termo) {
			params.set("q", termo);
		}

		const query = params.toString();
		router.replace(query ? `/produtos?${query}` : "/produtos");
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
		const campo = COLUNA_PARA_CAMPO_FILTRO_PRODUTO[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaProduto
	> => {
		const texto = (placeholder?: string): ConfigFiltroColunaProduto => ({
			tipo: "texto",
			placeholder,
		});
		return {
			codigo: texto("Ex: 123"),
			nome: texto("Nome do produto"),
			preco: texto("Preço"),
			inativo: {
				tipo: "opcoes",
				opcoes: [
					{ value: "0", label: "Ativo" },
					{ value: "1", label: "Inativo" },
				],
			},
			ean: texto("EAN"),
			referencia: texto("Referência"),
			ncm: texto("NCM"),
			unidademedida: texto("Unidade"),
			tipoproduto: texto("Tipo"),
			fornecedor: texto("Fornecedor"),
			custoaquisicao: texto("Custo"),
			datacadastro: { tipo: "data" },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"produtos",
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
				tipo: "P",
				...(qAplicado ? { q: qAplicado } : {}),
				...(filtrosColuna.nome ? { nome: filtrosColuna.nome } : {}),
				...(filtrosColuna.inativo !== ""
					? { inativo: Number(filtrosColuna.inativo) }
					: {}),
				...(filtrosColuna.codigo ? { codigo: filtrosColuna.codigo } : {}),
				...(filtrosColuna.ean ? { ean: filtrosColuna.ean } : {}),
				...(filtrosColuna.referencia
					? { referencia: filtrosColuna.referencia }
					: {}),
				...(filtrosColuna.ncm ? { ncm: filtrosColuna.ncm } : {}),
				...(filtrosColuna.unidademedida
					? { unidademedida: filtrosColuna.unidademedida }
					: {}),
				...(filtrosColuna.tipoproduto
					? { tipoproduto: filtrosColuna.tipoproduto }
					: {}),
				...(filtrosColuna.fornecedor
					? { fornecedor: filtrosColuna.fornecedor }
					: {}),
				...(filtrosColuna.preco ? { preco: filtrosColuna.preco } : {}),
				...(filtrosColuna.custoaquisicao
					? { custoaquisicao: filtrosColuna.custoaquisicao }
					: {}),
				...(filtrosColuna.datacadastro
					? { datacadastro: filtrosColuna.datacadastro }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletarProduto } = useMutation({
		mutationFn: async ({
			id,
			idempresa,
		}: {
			id: string;
			idempresa: string;
		}) => {
			return await produtosService.deletar(id, idempresa);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["produtos"] });
			toast.success("Produto excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir produto");
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
		}) => {
			return await produtosService.inativar(id, inativo, idempresa);
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["produtos"] });
			toast.success(
				variables.inativo === 1
					? "Produto inativado com sucesso!"
					: "Produto reativado com sucesso!",
			);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao alterar situação do produto");
		},
	});

	const handleEdit = useCallback(
		(produto: Produto) => {
			router.push(`/produtos/${produto.id}/editar`);
		},
		[router],
	);

	const handleDelete = useCallback(
		(id: string) => {
			if (!localStorageEmpresa) {
				toast.error("Empresa não selecionada");
				return;
			}

			toast.message("Tem certeza que deseja excluir este produto?", {
				position: "top-center",
				duration: 3000,
				action: {
					label: "Excluir",
					onClick: () =>
						deletarProduto({ id, idempresa: localStorageEmpresa.id }),
				},
				description: "Esta ação não pode ser desfeita.",
			});
		},
		[deletarProduto, localStorageEmpresa],
	);

	const handleToggleInativo = useCallback(
		(produto: Produto) => {
			if (!localStorageEmpresa) {
				toast.error("Empresa não selecionada");
				return;
			}

			const novoInativo = produto.inativo === 1 ? 0 : 1;
			const acao = novoInativo === 1 ? "inativar" : "reativar";

			toast.message(`Tem certeza que deseja ${acao} este produto?`, {
				position: "top-center",
				duration: 3000,
				action: {
					label: novoInativo === 1 ? "Inativar" : "Reativar",
					onClick: () =>
						alterarSituacao({
							id: produto.id,
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
			criarColunasProdutos({
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
						aria-label="Selecionar todos da página"
					/>
				),
				renderSelectCell: (row) => (
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label={`Selecionar produto ${row.original.nome}`}
					/>
				),
				renderAcoes: (produto) => {
					const inativo = produto.inativo === 1;
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
									<DropdownMenuItem onClick={() => handleEdit(produto)}>
										<IconPencil className="size-4" />
										Editar
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setProdutoComposicao(produto)}
									>
										<IconCalculator className="size-4" />
										Composição de preço
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => handleToggleInativo(produto)}
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
										onClick={() => handleDelete(produto.id)}
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
			rowSelection,
			columnVisibility,
		},
		onPaginationChange: setPagination,
		onRowSelectionChange: setRowSelection,
		onColumnVisibilityChange,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
		enableRowSelection: true,
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const colunasVisiveis = table.getVisibleLeafColumns();
	const idsSelecionados = Object.keys(rowSelection).filter(
		(id) => rowSelection[id],
	);

	const baixarModeloMutation = useMutation({
		mutationFn: async (formato: FormatoImportacaoProdutos) => {
			const blob = await produtosService.baixarTemplate(formato);
			return { blob, formato };
		},
		onSuccess: ({ blob, formato }) => {
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `modelo-produtos.${formato}`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			toast.success("Modelo baixado com sucesso");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao baixar modelo");
		},
	});

	const mostrarSkeleton = isLoading || isLoadingPreferencias;
	const comFiltros =
		!!qAplicado || filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-2 px-4">
					<h1 className="text-2xl font-bold">Produtos</h1>
					<div className="flex flex-wrap items-center gap-2">
						<div className="inline-flex -space-x-px rounded-md shadow-xs">
							<Button
								variant="outline"
								className="rounded-r-none"
								onClick={() => setFormatoImportacao("csv")}
								disabled={!localStorageEmpresa}
							>
								<FileText className="h-4 w-4" aria-hidden="true" />
								Importar CSV
							</Button>
							<Button
								variant="outline"
								className="rounded-none"
								onClick={() => setFormatoImportacao("xlsx")}
								disabled={!localStorageEmpresa}
							>
								<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
								Importar XLSX
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										className="rounded-l-none"
										disabled={
											!localStorageEmpresa || baixarModeloMutation.isPending
										}
									>
										<Download className="h-4 w-4" aria-hidden="true" />
										Baixar modelo
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => baixarModeloMutation.mutate("csv")}
									>
										Modelo CSV
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => baixarModeloMutation.mutate("xlsx")}
									>
										Modelo XLSX
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<Button
							variant="outline"
							className="gap-2"
							onClick={() => setDialogAlteracaoAberto(true)}
							disabled={!localStorageEmpresa || idsSelecionados.length === 0}
						>
							<IconPencil className="size-4" aria-hidden="true" />
							Alterar em massa
							{idsSelecionados.length > 0 ? ` (${idsSelecionados.length})` : ""}
						</Button>
						<Button
							onClick={() => router.push("/produtos/novo")}
							className="gap-2"
							disabled={!localStorageEmpresa}
						>
							<IconPlus className="size-4" />
							Incluir Novo Produto
						</Button>
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2 px-4">
					<div className="flex gap-2">
						<Input
							value={qInput}
							onChange={(event) => setQInput(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									handleBuscar();
								}
							}}
							placeholder="Buscar por nome, código, EAN ou preço..."
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
				<div className="rounded-lg border bg-card mx-4">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os produtos
							</p>
						</div>
					) : mostrarSkeleton ? (
						<TableSkeleton columns={colunasVisiveis.length || 6} rows={10}>
							{colunasVisiveis.map((coluna) => (
								<TableHead
									key={coluna.id}
									className={
										coluna.id === "acoes"
											? "w-12 text-end"
											: coluna.id === "select"
												? "w-10"
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
													? "Nenhum produto encontrado para os filtros selecionados."
													: "Nenhum produto encontrado."}
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

			<ImportarProdutosDialog
				formato={formatoImportacao}
				onFechar={() => setFormatoImportacao(null)}
			/>
			<AlterarProdutosEmMassaDialog
				aberto={dialogAlteracaoAberto}
				onAbertoChange={setDialogAlteracaoAberto}
				ids={idsSelecionados}
				onSucesso={() => setRowSelection({})}
			/>
			{produtoComposicao && localStorageEmpresa ? (
				<ModalComposicaoPrecoProduto
					produto={produtoComposicao}
					idempresa={localStorageEmpresa.id}
					aberto={!!produtoComposicao}
					onAbertoChange={(aberto) => {
						if (!aberto) setProdutoComposicao(null);
					}}
				/>
			) : null}
		</PageContainer>
	);
}

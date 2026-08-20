"use client";

import {
	IconBan,
	IconCheck,
	IconDotsVertical,
	IconPencil,
	IconPlus,
	IconSearch,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlterarProdutosEmMassaDialog } from "@/app/(auth)/produtos/components/alterar-produtos-em-massa-dialog";
import { ImportarProdutosDialog } from "@/app/(auth)/produtos/components/importar-produtos-dialog";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
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
	type FormatoImportacaoProdutos,
	type Produto,
	produtosService,
} from "@/services/produtos.service";
import { PageContainer } from "../components/page-container";

function formatarPreco(preco: string | null) {
	if (!preco) return "-";
	const numero = Number.parseFloat(preco);
	if (Number.isNaN(numero)) return "-";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(numero);
}

type ColumnsProps = {
	onEdit: (produto: Produto) => void;
	onDelete: (id: string) => void;
	onToggleInativo: (produto: Produto) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
	onToggleInativo,
}: ColumnsProps): ColumnDef<Produto>[] => [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Selecionar todos da página"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label={`Selecionar produto ${row.original.nome}`}
			/>
		),
		enableSorting: false,
	},
	{
		accessorKey: "codigo",
		header: "Código",
		cell: ({ row }) => <div>{row.getValue("codigo") ?? "-"}</div>,
	},
	{
		accessorKey: "nome",
		header: "Nome",
		cell: ({ row }) => {
			return (
				<div className="flex items-center gap-2">
					<span>{row.getValue("nome")}</span>
				</div>
			);
		},
	},
	{
		accessorKey: "preco",
		header: "Preço",
		cell: ({ row }) => <div>{formatarPreco(row.original.preco)}</div>,
	},
	{
		accessorKey: "inativo",
		header: "Situação",
		cell: ({ row }) => {
			const inativo = row.original.inativo === 1;
			return (
				<span
					className={
						inativo
							? "text-muted-foreground"
							: "text-green-600 dark:text-green-400"
					}
				>
					{inativo ? "Inativo" : "Ativo"}
				</span>
			);
		},
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const produto = row.original;
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
							<DropdownMenuItem onClick={() => onEdit(produto)}>
								<IconPencil className="size-4" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onToggleInativo(produto)}>
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
								onClick={() => onDelete(produto.id)}
							>
								<IconTrash className="size-4" />
								Excluir
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];

export default function ProdutosPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const qAplicado = searchParams.get("q")?.trim() ?? "";
	const [qInput, setQInput] = useState(qAplicado);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [formatoImportacao, setFormatoImportacao] =
		useState<FormatoImportacaoProdutos | null>(null);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [dialogAlteracaoAberto, setDialogAlteracaoAberto] = useState(false);

	useEffect(() => {
		setQInput(qAplicado);
	}, [qAplicado]);

	const empresaId = localStorageEmpresa?.id;
	// biome-ignore lint/correctness/useExhaustiveDependencies: limpa a seleção ao mudar busca ou empresa
	useEffect(() => {
		setRowSelection({});
	}, [qAplicado, empresaId]);

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

	const { data, isLoading } = useQuery({
		queryKey: [
			"produtos",
			localStorageEmpresa?.id,
			qAplicado,
			pagination.pageIndex + 1,
			pagination.pageSize,
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

	const handleEdit = (produto: Produto) => {
		router.push(`/produtos/${produto.id}/editar`);
	};

	const handleDelete = (id: string) => {
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
	};

	const handleToggleInativo = (produto: Produto) => {
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
	};

	const columns = createColumns({
		onEdit: handleEdit,
		onDelete: handleDelete,
		onToggleInativo: handleToggleInativo,
	});

	const table = useReactTable({
		data: data?.data || [],
		columns,
		state: {
			sorting,
			pagination,
			rowSelection,
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getRowId: (row) => row.id,
		enableRowSelection: true,
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

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
				<div className="flex gap-2 px-4">
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
				<div className="rounded-lg border bg-card mx-4">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os produtos
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10}>
							<TableHead className="w-10" />
							<TableHead>Código</TableHead>
							<TableHead>Nome</TableHead>
							<TableHead className="w-[140px]">Preço</TableHead>
							<TableHead className="w-[120px]">Situação</TableHead>
							<TableHead className="w-12 text-end">Ações</TableHead>
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
												colSpan={table.getAllColumns().length}
												className="h-24 text-center"
											>
												Nenhum produto encontrado.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
							{data && data.paginacao.total > 0 && (
								<div className="flex flex-col gap-4 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-center gap-2">
										<Label htmlFor="produtos-por-pagina" className="text-sm">
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
												id="produtos-por-pagina"
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
		</PageContainer>
	);
}

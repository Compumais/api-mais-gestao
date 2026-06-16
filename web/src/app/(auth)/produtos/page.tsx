"use client";

import {
	IconBan,
	IconCheck,
	IconDotsVertical,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { type Produto, produtosService } from "@/services/produtos.service";
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
		accessorKey: "codigo",
		header: "Código",
		cell: ({ row }) => <div>{row.getValue("codigo") ?? "-"}</div>,
	},
	{
		accessorKey: "nome",
		header: "Nome",
		cell: ({ row }) => {
			const produto = row.original;
			return (
				<div className="flex items-center gap-2">
					<span>{row.getValue("nome")}</span>
					{produto.enviamobile === 1 && (
						<Badge variant="secondary" className="text-xs">
							Garçom
						</Badge>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: "preco",
		header: "Preço",
		cell: ({ row }) => (
			<div>{formatarPreco(row.original.preco)}</div>
		),
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
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});

	const { data, isLoading } = useQuery({
		queryKey: [
			"produtos",
			localStorageEmpresa?.id,
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
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletarProduto } = useMutation({
		mutationFn: produtosService.deletar,
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
		}: {
			id: string;
			inativo: number;
		}) => {
			return await produtosService.inativar(id, inativo);
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
		toast.message("Tem certeza que deseja excluir este produto?", {
			position: "top-center",
			duration: 3000,
			action: {
				label: "Excluir",
				onClick: () => deletarProduto(id),
			},
			description: "Esta ação não pode ser desfeita.",
		});
	};

	const handleToggleInativo = (produto: Produto) => {
		const novoInativo = produto.inativo === 1 ? 0 : 1;
		const acao = novoInativo === 1 ? "inativar" : "reativar";

		toast.message(`Tem certeza que deseja ${acao} este produto?`, {
			position: "top-center",
			duration: 3000,
			action: {
				label: novoInativo === 1 ? "Inativar" : "Reativar",
				onClick: () =>
					alterarSituacao({ id: produto.id, inativo: novoInativo }),
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
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Produtos</h1>
					<Button
						onClick={() => router.push("/produtos/novo")}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Incluir Novo Produto
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
												colSpan={table.getAllColumns().length}
												className="h-24 text-center"
											>
												Nenhum produto encontrado.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
							{data && data.paginacao.totalPages > 1 && (
								<div className="flex items-center justify-between px-4 py-4 border-t">
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

"use client";

import {
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
import {
	type UnidadeMedida,
	isUnidadeMedidaGlobal,
	unidadeMedidaService,
} from "@/services/unidade-medida.service";
import { PageContainer } from "../components/page-container";

type ColumnsProps = {
	onEdit: (unidadeMedida: UnidadeMedida) => void;
	onDelete: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<UnidadeMedida>[] => [
	{
		accessorKey: "codigo",
		header: "Código",
		cell: ({ row }) => <div>{row.getValue("codigo") || "-"}</div>,
	},
	{
		accessorKey: "nome",
		header: "Nome",
		cell: ({ row }) => <div>{row.getValue("nome") || "-"}</div>,
	},
	{
		id: "origem",
		header: "Origem",
		cell: ({ row }) => {
			const unidadeMedida = row.original;
			return isUnidadeMedidaGlobal(unidadeMedida) ? (
				<Badge variant="secondary">Sistema</Badge>
			) : (
				<Badge variant="outline">Empresa</Badge>
			);
		},
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const unidadeMedida = row.original;
			const isGlobal = isUnidadeMedidaGlobal(unidadeMedida);

			if (isGlobal) {
				return (
					<div className="flex justify-end text-sm text-muted-foreground">
						Somente leitura
					</div>
				);
			}

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
							<DropdownMenuItem onClick={() => onEdit(unidadeMedida)}>
								<IconPencil className="size-4" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => onDelete(unidadeMedida.id)}
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

export default function UnidadeMedidaPage() {
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
			"unidades-medida",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await unidadeMedidaService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletarUnidadeMedida } = useMutation({
		mutationFn: unidadeMedidaService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["unidades-medida"] });
			toast.success("Unidade de medida excluída com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir unidade de medida");
		},
	});

	const handleEdit = (unidadeMedida: UnidadeMedida) => {
		router.push(`/unidade-medida/${unidadeMedida.id}/editar`);
	};

	const handleDelete = (id: string) => {
		toast.message("Tem certeza que deseja excluir esta unidade de medida?", {
			position: "top-center",
			duration: 3000,
			action: {
				label: "Excluir",
				onClick: () => deletarUnidadeMedida(id),
			},
			description: "Esta ação não pode ser desfeita.",
		});
	};

	const columns = createColumns({
		onEdit: handleEdit,
		onDelete: handleDelete,
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
					<h1 className="text-2xl font-bold">Unidades de Medida</h1>
					<Button
						onClick={() => router.push("/unidade-medida/novo")}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Cadastrar Nova Unidade
					</Button>
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as unidades de medida
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10}>
							<TableHead className="w-[120px]">Código</TableHead>
							<TableHead>Nome</TableHead>
							<TableHead className="w-[120px]">Origem</TableHead>
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
												Nenhuma unidade de medida encontrada.
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

"use client";

import {
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
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
	type ContaCorrenteListItem,
	contasCorrentesService,
} from "@/services/contas-correntes.service";
import { PageContainer } from "../components/page-container";
import { TableSkeleton } from "@/components/table-skeleton";

type ColumnsProps = {
	onEdit: (contaCorrente: ContaCorrenteListItem) => void;
	onDelete: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<ContaCorrenteListItem>[] => [
	{
		accessorKey: "descricao",
		header: "Descrição",
		cell: ({ row }) => <div>{row.getValue("descricao") || "—"}</div>,
	},
	{
		accessorKey: "agencia",
		header: "Agência",
		cell: ({ row }) => <div>{row.getValue("agencia") || "—"}</div>,
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const contaCorrente = row.original;

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
							<DropdownMenuItem onClick={() => onEdit(contaCorrente)}>
								<IconPencil className="size-4" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => onDelete(contaCorrente.id)}
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

export default function ContasCorrentesPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtroDescricao, setFiltroDescricao] = useState("");
	const [filtroAgencia, setFiltroAgencia] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: [
			"contas-correntes",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtroDescricao,
			filtroAgencia,
		],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await contasCorrentesService.listar({
				idempresa: empresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: deletarContaCorrente } = useMutation({
		mutationFn: contasCorrentesService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["contas-correntes"] });
			toast.success("Conta corrente excluída com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir conta corrente");
		},
	});

	const handleEdit = (contaCorrente: ContaCorrenteListItem) => {
		router.push(`/contas-correntes/${contaCorrente.id}/editar`);
	};

	const handleDelete = (id: string) => {
		toast.message("Tem certeza que deseja excluir esta conta corrente?", {
			position: "top-center",
			duration: 3000,
			action: {
				label: "Excluir",
				onClick: () => deletarContaCorrente(id),
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

	const handleFiltroDescricao = (value: string) => {
		setFiltroDescricao(value);
		setPagination({ ...pagination, pageIndex: 0 });
	};

	const handleFiltroAgencia = (value: string) => {
		setFiltroAgencia(value);
		setPagination({ ...pagination, pageIndex: 0 });
	};

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Contas Correntes</h1>
					<Button
						onClick={() => router.push("/contas-correntes/novo")}
						className="gap-2"
					>
						<IconPlus className="size-4" />
						Cadastrar Nova Conta Corrente
					</Button>
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as contas correntes
							</p>
						</div>
					) : (
						<>
							<div className="p-4 border-b">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="relative">
										<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
										<Input
											type="text"
											placeholder="Filtrar por agência..."
											value={filtroAgencia}
											onChange={(e) => handleFiltroAgencia(e.target.value)}
											className="pl-9"
											aria-label="Filtrar contas correntes por agência"
										/>
									</div>
									<div className="relative">
										<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
										<Input
											type="text"
											placeholder="Filtrar por descrição..."
											value={filtroDescricao}
											onChange={(e) => handleFiltroDescricao(e.target.value)}
											className="pl-9"
											aria-label="Filtrar contas correntes por descrição"
										/>
									</div>
								</div>
							</div>
							{isLoading ? (
								<TableSkeleton rows={10} columns={3}>
									<TableCell>Descrição</TableCell>
									<TableCell>Agência</TableCell>
									<TableCell className="w-10">Ações</TableCell>
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
														Nenhuma conta corrente encontrada.
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
						</>
					)}
				</div>
			</div>
		</PageContainer>
	);
}

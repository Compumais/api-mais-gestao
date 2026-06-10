"use client";

import { Metadata } from "next";
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
import { type Banco, bancosService } from "@/services/bancos.service";
import { isBancoPadrao } from "@/util/bancos-padrao";
import { PageContainer } from "../components/page-container";
import { TableSkeleton } from "@/components/table-skeleton";

type ColumnsProps = {
	onEdit: (banco: Banco) => void;
	onDelete: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<Banco>[] => [
	{
		accessorKey: "codigo",
		header: "Código",
		cell: ({ row }) => <div>{row.getValue("codigo")}</div>,
	},
	{
		accessorKey: "nome",
		header: "Nome",
		cell: ({ row }) => <div>{row.getValue("nome")}</div>,
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const banco = row.original;
			const isPadrao = isBancoPadrao(banco);

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
							{!isPadrao && (
								<>
									<DropdownMenuItem onClick={() => onEdit(banco)}>
										<IconPencil className="size-4" />
										Editar
									</DropdownMenuItem>
									<DropdownMenuSeparator />
								</>
							)}
							{!isPadrao && (
								<DropdownMenuItem
									variant="destructive"
									onClick={() => onDelete(banco.id)}
								>
									<IconTrash className="size-4" />
									Excluir
								</DropdownMenuItem>
							)}
							{isPadrao && (
								<DropdownMenuItem disabled>
									<span className="text-muted-foreground text-sm">
										Banco padrão (não editável)
									</span>
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];

export default function BancosPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtroNome, setFiltroNome] = useState("");
	const [filtroCodigo, setFiltroCodigo] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: [
			"bancos",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtroNome,
			filtroCodigo,
		],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await bancosService.listar({
				idempresa: empresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				nome: filtroNome || undefined,
				codigo: filtroCodigo || undefined,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: deletarBanco } = useMutation({
		mutationFn: bancosService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bancos"] });
			toast.success("Banco excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir banco");
		},
	});

	const handleEdit = (banco: Banco) => {
		const isPadrao = isBancoPadrao(banco);
		if (isPadrao) {
			toast.error("Bancos padrão não podem ser editados");
			return;
		}
		router.push(`/bancos/${banco.id}/editar`);
	};

	const handleDelete = (id: string) => {
		toast.message("Tem certeza que deseja excluir este banco?", {
			position: "top-center",
			duration: 3000,
			action: {
				label: "Excluir",
				onClick: () => deletarBanco(id),
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

	const handleFiltroChange = (value: string) => {
		setFiltroNome(value);
		setPagination({ ...pagination, pageIndex: 0 });
	};

	const handleFiltroCodigo = (value: string) => {
		setFiltroCodigo(value);
		setPagination({ ...pagination, pageIndex: 0 });
	};

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Bancos</h1>
					<Button onClick={() => router.push("/bancos/novo")} className="gap-2">
						<IconPlus className="size-4" />
						Cadastrar Novo Banco
					</Button>
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os bancos
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
											placeholder="Filtrar por código..."
											value={filtroCodigo}
											onChange={(e) => handleFiltroCodigo(e.target.value)}
											className="pl-9"
											aria-label="Filtrar bancos por código"
										/>
									</div>
									<div className="relative">
										<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
										<Input
											type="text"
											placeholder="Filtrar por nome..."
											value={filtroNome}
											onChange={(e) => handleFiltroChange(e.target.value)}
											className="pl-9"
											aria-label="Filtrar bancos por nome"
										/>
									</div>
								</div>
							</div>
							{isLoading ? (
								<TableSkeleton rows={10} columns={3}>
									<TableCell className="w-32">Código</TableCell>
									<TableCell>Nome</TableCell>
									<TableCell className="w-12">Ações</TableCell>
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
														Nenhum banco encontrado.
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

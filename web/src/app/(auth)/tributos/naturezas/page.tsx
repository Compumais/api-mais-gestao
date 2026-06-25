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
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type Cfop,
	type TipoMovimentoCfop,
	cfopService,
	inferirTipoMovimentoCfop,
} from "@/services/cfop.service";

const ROTA_BASE = "/tributos/naturezas";

type ColumnsProps = {
	onEdit: (natureza: Cfop) => void;
	onDelete: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<Cfop>[] => [
	{
		accessorKey: "codigo",
		header: "Código",
		cell: ({ row }) => <div>{row.getValue("codigo") || "-"}</div>,
	},
	{
		accessorKey: "descricao",
		header: "Descrição",
		cell: ({ row }) => (
			<div className="max-w-xl truncate">{row.getValue("descricao") || "-"}</div>
		),
	},
	{
		id: "tipo",
		header: "Tipo",
		cell: ({ row }) => {
			const tipo = inferirTipoMovimentoCfop(row.original.codigo);

			if (tipo === "E") {
				return <Badge variant="secondary">Entrada</Badge>;
			}

			if (tipo === "S") {
				return <Badge variant="outline">Saída</Badge>;
			}

			return <span className="text-muted-foreground">-</span>;
		},
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const registro = row.original;

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
							<DropdownMenuItem onClick={() => onEdit(registro)}>
								<IconPencil className="size-4" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => onDelete(registro.id)}
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

export default function NaturezasPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoMovimentoCfop>(
		"todos",
	);
	const [filtroCodigo, setFiltroCodigo] = useState("");
	const [filtroDescricao, setFiltroDescricao] = useState("");
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});

	const { data, isLoading } = useQuery({
		queryKey: [
			"cfops",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtroTipo,
			filtroCodigo,
			filtroDescricao,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}

			return await cfopService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				codigo: filtroCodigo || undefined,
				descricao: filtroDescricao || undefined,
				tipomovimento: filtroTipo === "todos" ? undefined : filtroTipo,
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletarNatureza } = useMutation({
		mutationFn: cfopService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cfops"] });
			toast.success("Natureza excluída com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir natureza");
		},
	});

	const handleEdit = (registro: Cfop) => {
		router.push(`${ROTA_BASE}/${registro.id}/editar`);
	};

	const handleDelete = (id: string) => {
		toast.message("Tem certeza que deseja excluir esta natureza?", {
			position: "top-center",
			duration: 3000,
			action: {
				label: "Excluir",
				onClick: () => deletarNatureza(id),
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
		<section className="px-4" aria-labelledby="naturezas-titulo">
			<div className="mb-4 flex items-center justify-between gap-4">
				<h1 id="naturezas-titulo" className="text-2xl font-bold">
					Naturezas
				</h1>
				<Button
					onClick={() => router.push(`${ROTA_BASE}/novo`)}
					className="gap-2"
					disabled={!localStorageEmpresa}
				>
					<IconPlus className="size-4" />
					Cadastrar natureza
				</Button>
			</div>

			<div className="rounded-lg border bg-card">
				{!localStorageEmpresa ? (
					<div className="flex items-center justify-center py-8">
						<p className="text-muted-foreground">
							Selecione uma empresa para visualizar as naturezas
						</p>
					</div>
				) : (
					<>
						<div className="flex flex-col gap-4 border-b p-4">
							<Tabs
								value={filtroTipo}
								onValueChange={(valor) => {
									setFiltroTipo(valor as "todos" | TipoMovimentoCfop);
									setPagination((estado) => ({
										...estado,
										pageIndex: 0,
									}));
								}}
							>
								<TabsList>
									<TabsTrigger value="todos">Todos</TabsTrigger>
									<TabsTrigger value="E">Entrada</TabsTrigger>
									<TabsTrigger value="S">Saída</TabsTrigger>
								</TabsList>
							</Tabs>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<Input
									placeholder="Filtrar por código CFOP"
									value={filtroCodigo}
									onChange={(evento) => {
										setFiltroCodigo(evento.target.value);
										setPagination((estado) => ({
											...estado,
											pageIndex: 0,
										}));
									}}
								/>
								<Input
									placeholder="Filtrar por descrição"
									value={filtroDescricao}
									onChange={(evento) => {
										setFiltroDescricao(evento.target.value);
										setPagination((estado) => ({
											...estado,
											pageIndex: 0,
										}));
									}}
								/>
							</div>
						</div>

						{isLoading ? (
							<TableSkeleton rows={10}>
								<TableHead className="w-[120px]">Código</TableHead>
								<TableHead>Descrição</TableHead>
								<TableHead className="w-[120px]">Tipo</TableHead>
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
													Nenhuma natureza encontrada.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
								{data && data.paginacao.totalPages > 1 && (
									<div className="flex items-center justify-between border-t px-4 py-4">
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
		</section>
	);
}

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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type TipoProblema,
	tipoProblemaService,
} from "@/services/tipo-problema.service";
import { PageContainer } from "../components/page-container";

const ROTA_BASE = "/tipos-problema";

type ColumnsProps = {
	onEdit: (registro: TipoProblema) => void;
	onDelete: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<TipoProblema>[] => [
	{
		accessorKey: "codigo",
		header: "Código",
		cell: ({ row }) => <div>{row.getValue("codigo") || "-"}</div>,
	},
	{
		accessorKey: "descricao",
		header: "Descrição",
		cell: ({ row }) => (
			<div className="max-w-md truncate">{row.getValue("descricao") || "-"}</div>
		),
	},
	{
		id: "status",
		header: "Status",
		cell: ({ row }) =>
			row.original.inativo === 1 ? (
				<Badge variant="secondary">Inativo</Badge>
			) : (
				<Badge variant="outline">Ativo</Badge>
			),
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

export default function TiposProblemaPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [busca, setBusca] = useState("");
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});

	const { data, isLoading } = useQuery({
		queryKey: [
			"tipos-problema",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			busca,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await tipoProblemaService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				descricao: busca || undefined,
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletar } = useMutation({
		mutationFn: tipoProblemaService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tipos-problema"] });
			queryClient.invalidateQueries({ queryKey: ["tipos-problema-os-form"] });
			queryClient.invalidateQueries({
				queryKey: ["tipos-problema-os-detalhe"],
			});
			toast.success("Tipo de problema excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir tipo de problema");
		},
	});

	const handleEdit = (registro: TipoProblema) => {
		router.push(`${ROTA_BASE}/${registro.id}/editar`);
	};

	const handleDelete = (id: string) => {
		toast.message("Tem certeza que deseja excluir este tipo de problema?", {
			position: "top-center",
			duration: 3000,
			action: {
				label: "Excluir",
				onClick: () => deletar(id),
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
				<div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold">Tipos de problema</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Cadastre os tipos de problema usados nas ordens de serviço.
						</p>
					</div>
					<Button
						onClick={() => router.push(`${ROTA_BASE}/novo`)}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Novo tipo de problema
					</Button>
				</div>

				<div className="px-4">
					<Input
						placeholder="Buscar por descrição..."
						value={busca}
						onChange={(event) => {
							setBusca(event.target.value);
							setPagination((prev) => ({ ...prev, pageIndex: 0 }));
						}}
						className="max-w-sm"
						aria-label="Buscar tipos de problema por descrição"
					/>
				</div>

				<div className="mx-4 rounded-lg border bg-card">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os tipos de problema
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10}>
							<TableHead className="w-[100px]">Código</TableHead>
							<TableHead>Descrição</TableHead>
							<TableHead className="w-[100px]">Status</TableHead>
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
												Nenhum tipo de problema encontrado.
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

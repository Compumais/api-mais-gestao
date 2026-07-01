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
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
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
	type FatorConversao,
	fatorConversaoService,
	formatarFatorConversao,
} from "@/services/fator-conversao.service";
import { PageContainer } from "../components/page-container";

type ColumnsProps = {
	onEdit: (fator: FatorConversao) => void;
	onDelete: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<FatorConversao>[] => [
	{
		accessorKey: "nome",
		header: "Nome",
		cell: ({ row }) => <div>{row.getValue("nome")}</div>,
	},
	{
		accessorKey: "fator",
		header: "Fator",
		cell: ({ row }) => (
			<div className="tabular-nums">
				{formatarFatorConversao(row.original.fator)}
			</div>
		),
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const fator = row.original;

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
							<DropdownMenuItem onClick={() => onEdit(fator)}>
								<IconPencil className="size-4" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => onDelete(fator.id)}
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

export default function FatorConversaoPage() {
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

	useEffect(() => {
		setQInput(qAplicado);
	}, [qAplicado]);

	const handleBuscar = () => {
		const termo = qInput.trim();
		setPagination((p) => ({ ...p, pageIndex: 0 }));

		const params = new URLSearchParams();
		if (termo) {
			params.set("q", termo);
		}

		const query = params.toString();
		router.replace(query ? `/fator-conversao?${query}` : "/fator-conversao");
	};

	const { data, isLoading } = useQuery({
		queryKey: [
			"fatores-conversao",
			localStorageEmpresa?.id,
			qAplicado,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await fatorConversaoService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(qAplicado ? { q: qAplicado } : {}),
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletarFator } = useMutation({
		mutationFn: fatorConversaoService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fatores-conversao"] });
			toast.success("Fator de conversão excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir fator de conversão");
		},
	});

	const handleEdit = (fator: FatorConversao) => {
		router.push(`/fator-conversao/${fator.id}/editar`);
	};

	const handleDelete = (id: string) => {
		toast.message("Tem certeza que deseja excluir este fator de conversão?", {
			position: "top-center",
			duration: 3000,
			action: {
				label: "Excluir",
				onClick: () => deletarFator(id),
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
					<h1 className="text-2xl font-bold">Fatores de Conversão</h1>
					<Button
						onClick={() => router.push("/fator-conversao/novo")}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Cadastrar Novo Fator
					</Button>
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
						placeholder="Buscar por nome..."
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
				<div className="mx-4 rounded-lg border bg-card">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os fatores de conversão
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10}>
							<TableHead>Nome</TableHead>
							<TableHead className="w-[120px]">Fator</TableHead>
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
												Nenhum fator de conversão encontrado.
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
				</div>
			</div>
		</PageContainer>
	);
}

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
import { formatarEscopoCondicaoPagamento } from "@/schemas/condicao-pagamento.schema";
import {
	type CondicaoPagamento,
	condicaoPagamentoService,
} from "@/services/condicao-pagamento.service";
import { PageContainer } from "../components/page-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormasErpTab } from "./components/formas-erp-tab";

const ROTA_BASE = "/meios-pagamento";

type ColumnsProps = {
	onEdit: (registro: CondicaoPagamento) => void;
	onDelete: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<CondicaoPagamento>[] => [
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
		accessorKey: "parcelas",
		header: "Parcelas",
		cell: ({ row }) => <div>{row.getValue("parcelas") ?? "-"}</div>,
	},
	{
		accessorKey: "prazos",
		header: "Prazos",
		cell: ({ row }) => <div>{row.getValue("prazos") || "-"}</div>,
	},
	{
		id: "escopo",
		header: "Escopo",
		cell: ({ row }) => (
			<div>{formatarEscopoCondicaoPagamento(row.original.escopo)}</div>
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

export default function MeiosPagamentoPage() {
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
			"meios-pagamento",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			busca,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await condicaoPagamentoService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				descricao: busca || undefined,
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletar } = useMutation({
		mutationFn: condicaoPagamentoService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meios-pagamento"] });
			toast.success("Meio de pagamento excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir meio de pagamento");
		},
	});

	const handleEdit = (registro: CondicaoPagamento) => {
		router.push(`${ROTA_BASE}/${registro.id}/editar`);
	};

	const handleDelete = (id: string) => {
		toast.message("Tem certeza que deseja excluir este meio de pagamento?", {
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
				<div className="px-4">
					<h1 className="text-2xl font-bold">Meios de pagamento</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Condições de parcelamento e formas usadas na NF-e e no financeiro.
					</p>
				</div>

				<Tabs defaultValue="condicoes" className="px-4">
					<TabsList>
						<TabsTrigger value="condicoes">Condições de pagamento</TabsTrigger>
						<TabsTrigger value="formas-erp">Formas ERP (NF-e)</TabsTrigger>
					</TabsList>

					<TabsContent value="condicoes" className="mt-4 space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<h2 className="text-lg font-semibold">Condições de pagamento</h2>
					<Button
						onClick={() => router.push(`${ROTA_BASE}/novo`)}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Cadastrar condição
					</Button>
				</div>

				<div className="px-0">
					<Input
						placeholder="Buscar por descrição..."
						value={busca}
						onChange={(event) => {
							setBusca(event.target.value);
							setPagination((prev) => ({ ...prev, pageIndex: 0 }));
						}}
						className="max-w-sm"
						aria-label="Buscar meios de pagamento por descrição"
					/>
				</div>

				<div className="rounded-lg border bg-card">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os meios de pagamento
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10}>
							<TableHead className="w-[100px]">Código</TableHead>
							<TableHead>Descrição</TableHead>
							<TableHead className="w-[100px]">Parcelas</TableHead>
							<TableHead className="w-[120px]">Prazos</TableHead>
							<TableHead className="w-[140px]">Escopo</TableHead>
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
												Nenhum meio de pagamento encontrado.
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
					</TabsContent>

					<TabsContent value="formas-erp" className="mt-4">
						<FormasErpTab />
					</TabsContent>
				</Tabs>
			</div>
		</PageContainer>
	);
}

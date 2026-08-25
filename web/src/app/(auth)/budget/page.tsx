"use client";

import {
	IconChartBar,
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
import { TableSkeleton } from "@/components/table-skeleton";
import { nomeMesBudget } from "@/constants/budget-constants";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type BudgetComPlanoContas,
	budgetsService,
} from "@/services/budgets.service";
import { PageContainer } from "../components/page-container";

const formatarMoeda = (valor: string | number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number(valor));

type ColumnsProps = {
	onEdit: (budget: BudgetComPlanoContas) => void;
	onDelete: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<BudgetComPlanoContas>[] => [
	{
		id: "planocontas",
		header: "Plano de contas",
		cell: ({ row }) => {
			const budget = row.original;
			return (
				<div>
					{budget.planocontascodigo ? `${budget.planocontascodigo} - ` : ""}
					{budget.planocontasnome ?? budget.idplanocontas}
				</div>
			);
		},
	},
	{
		accessorKey: "ano",
		header: "Ano",
		cell: ({ row }) => <div>{row.getValue("ano")}</div>,
	},
	{
		accessorKey: "periodicidade",
		header: "Periodicidade",
		cell: ({ row }) => {
			const periodicidade = row.getValue<string>("periodicidade");
			return (
				<Badge variant={periodicidade === "A" ? "secondary" : "outline"}>
					{periodicidade === "A" ? "Anual" : "Mensal"}
				</Badge>
			);
		},
	},
	{
		accessorKey: "mes",
		header: "Mês",
		cell: ({ row }) => {
			const mes = row.getValue<number | null>("mes");
			return <div>{mes ? nomeMesBudget(mes) : "—"}</div>;
		},
	},
	{
		accessorKey: "valor",
		header: "Valor limite",
		cell: ({ row }) => (
			<div className="font-medium">
				{formatarMoeda(row.getValue<string>("valor"))}
			</div>
		),
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const budget = row.original;

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
							<DropdownMenuItem onClick={() => onEdit(budget)}>
								<IconPencil className="size-4" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => onDelete(budget.id)}
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

export default function BudgetPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
	const [filtroPeriodicidade, setFiltroPeriodicidade] = useState<string>("");

	const { data, isLoading } = useQuery({
		queryKey: [
			"budgets",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtroAno,
			filtroPeriodicidade,
		],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await budgetsService.listar({
				idempresa: empresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				ano: filtroAno ? Number(filtroAno) : undefined,
				periodicidade:
					filtroPeriodicidade === "M" || filtroPeriodicidade === "A"
						? filtroPeriodicidade
						: undefined,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: deletarBudget } = useMutation({
		mutationFn: budgetsService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["budgets"] });
			toast.success("Budget excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir budget");
		},
	});

	const handleEdit = (budget: BudgetComPlanoContas) => {
		router.push(`/budget/${budget.id}/editar`);
	};

	const handleDelete = (id: string) => {
		toast.message("Tem certeza que deseja excluir este budget?", {
			position: "top-center",
			duration: 3000,
			action: {
				label: "Excluir",
				onClick: () => deletarBudget(id),
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

	const handleFiltroAno = (value: string) => {
		setFiltroAno(value);
		setPagination({ ...pagination, pageIndex: 0 });
	};

	const handleFiltroPeriodicidade = (value: string) => {
		setFiltroPeriodicidade(value === "todas" ? "" : value);
		setPagination({ ...pagination, pageIndex: 0 });
	};

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Budget</h1>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => router.push("/budget/acompanhamento")}
							className="gap-2"
						>
							<IconChartBar className="size-4" />
							Acompanhamento
						</Button>
						<Button
							onClick={() => router.push("/budget/novo")}
							className="gap-2"
						>
							<IconPlus className="size-4" />
							Cadastrar Novo Budget
						</Button>
					</div>
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os budgets
							</p>
						</div>
					) : (
						<>
							<div className="p-4 border-b">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Input
										type="number"
										placeholder="Filtrar por ano..."
										value={filtroAno}
										onChange={(e) => handleFiltroAno(e.target.value)}
										aria-label="Filtrar budgets por ano"
									/>
									<Select
										value={filtroPeriodicidade || "todas"}
										onValueChange={handleFiltroPeriodicidade}
									>
										<SelectTrigger
											aria-label="Filtrar budgets por periodicidade"
											className="w-full"
										>
											<SelectValue placeholder="Periodicidade" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="todas">
												Todas as periodicidades
											</SelectItem>
											<SelectItem value="M">Mensal</SelectItem>
											<SelectItem value="A">Anual</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							{isLoading ? (
								<TableSkeleton rows={10} columns={6}>
									<TableCell>Plano de contas</TableCell>
									<TableCell className="w-20">Ano</TableCell>
									<TableCell className="w-32">Periodicidade</TableCell>
									<TableCell className="w-28">Mês</TableCell>
									<TableCell className="w-32">Valor limite</TableCell>
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
														Nenhum budget encontrado.
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

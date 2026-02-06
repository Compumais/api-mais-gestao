"use client";

import {
	IconDotsVertical,
	IconPencil,
	IconTrash,
	IconEye,
	IconCheck,
	IconPlus,
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	type Financeiro,
	financeiroService,
} from "@/services/financeiro.service";
import { PageContainer } from "../components/page-container";

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	const num = parseFloat(value);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
};

const formatDate = (date: string | null | undefined) => {
	if (!date) return "-";
	return new Date(date).toLocaleDateString("pt-BR");
};

const getStatusBadge = (status: string | null | undefined) => {
	if (!status) return <Badge variant="outline">-</Badge>;

	const statusMap: Record<
		string,
		{
			label: string;
			variant: "default" | "secondary" | "destructive" | "outline";
		}
	> = {
		A: { label: "Aberto", variant: "default" },
		P: { label: "Pago", variant: "secondary" },
		C: { label: "Cancelado", variant: "destructive" },
		V: { label: "Vencido", variant: "destructive" },
	};

	const statusInfo = statusMap[status] || {
		label: status,
		variant: "outline" as const,
	};

	return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
};

const calculateSaldoSemJurosMulta = (financeiro: Financeiro) => {
	const saldo = parseFloat(financeiro.saldo || "0");
	const juros = financeiro.juros || 0;
	const multa = financeiro.multa || 0;
	return saldo - juros - multa;
};

type ColumnsProps = {
	onEdit: (financeiro: Financeiro) => void;
	onDelete: (id: string) => void;
	onDarBaixa: (id: string) => void;
	onVerDetalhes: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
	onDarBaixa,
	onVerDetalhes,
}: ColumnsProps): ColumnDef<Financeiro>[] => [
	{
		accessorKey: "documento",
		header: "Documento",
		cell: ({ row }) => (
			<div className="font-medium">{row.getValue("documento") || "-"}</div>
		),
	},
	{
		accessorKey: "emitente",
		header: "Nome",
		cell: ({ row }) => <div>{row.getValue("emitente") || "-"}</div>,
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => getStatusBadge(row.getValue("status")),
	},
	{
		accessorKey: "emissao",
		header: "Emissão",
		cell: ({ row }) => <div>{formatDate(row.getValue("emissao"))}</div>,
	},
	{
		accessorKey: "vencimento",
		header: "Vencimento",
		cell: ({ row }) => <div>{formatDate(row.getValue("vencimento"))}</div>,
	},
	{
		accessorKey: "valor",
		header: () => <div className="text-right">Valor</div>,
		cell: ({ row }) => {
			const valor = row.getValue("valor") as string;
			return (
				<div className="text-right font-medium">{formatCurrency(valor)}</div>
			);
		},
	},
	{
		accessorKey: "saldo",
		header: () => <div className="text-right">Saldo</div>,
		cell: ({ row }) => {
			const saldo = row.getValue("saldo") as string;
			return (
				<div className="text-right font-medium">{formatCurrency(saldo)}</div>
			);
		},
	},
	{
		id: "saldoSemJurosMulta",
		header: () => <div className="text-right">Saldo sem juros/multa</div>,
		cell: ({ row }) => {
			const saldoSemJurosMulta = calculateSaldoSemJurosMulta(row.original);
			return (
				<div className="text-right font-medium">
					{formatCurrency(saldoSemJurosMulta.toString())}
				</div>
			);
		},
	},
	{
		accessorKey: "tipo",
		header: "Tipo",
		cell: ({ row }) => {
			const tipo = row.getValue("tipo") as string | null;
			return (
				<Badge variant="outline">
					{tipo === "P" ? "Pagar" : tipo === "R" ? "Receber" : "-"}
				</Badge>
			);
		},
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const financeiro = row.original;
			const podeExcluir = financeiro.status === "A" && !financeiro.baixa;
			const podeDarBaixa = financeiro.status === "A" && !financeiro.baixa;

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
							<DropdownMenuItem onClick={() => onVerDetalhes(financeiro.id)}>
								<IconEye className="size-4 mr-2" />
								Ver detalhes
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onEdit(financeiro)}>
								<IconPencil className="size-4 mr-2" />
								Editar
							</DropdownMenuItem>
							{podeDarBaixa && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => onDarBaixa(financeiro.id)}>
										<IconCheck className="size-4 mr-2" />
										Dar baixa
									</DropdownMenuItem>
								</>
							)}
							{podeExcluir && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										variant="destructive"
										onClick={() => onDelete(financeiro.id)}
									>
										<IconTrash className="size-4 mr-2" />
										Excluir
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
		enableHiding: false,
	},
];

export default function ContasAReceberPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [financeiroToDelete, setFinanceiroToDelete] = useState<string | null>(
		null,
	);

	const { data, isLoading } = useQuery({
		queryKey: [
			"financeiro",
			"contas-receber",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await financeiroService.listar({
				tipo: "R",
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			});
		},
		enabled: !!empresa,
	});

	const deleteMutation = useMutation({
		mutationFn: financeiroService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["financeiro"] });
			toast.success("Conta a receber excluída com sucesso!");
			setDeleteDialogOpen(false);
			setFinanceiroToDelete(null);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir conta a receber");
		},
	});

	const darBaixaMutation = useMutation({
		mutationFn: financeiroService.darBaixa,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["financeiro"] });
			toast.success("Baixa realizada com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao dar baixa na conta a receber");
		},
	});

	const handleEdit = (financeiro: Financeiro) => {
		router.push(`/contas-receber/${financeiro.id}/editar`);
	};

	const handleDelete = (id: string) => {
		setFinanceiroToDelete(id);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = () => {
		if (financeiroToDelete) {
			deleteMutation.mutate(financeiroToDelete);
		}
	};

	const handleDarBaixa = (id: string) => {
		darBaixaMutation.mutate(id);
	};

	const handleVerDetalhes = (id: string) => {
		router.push(`/contas-receber/${id}`);
	};

	const columns = createColumns({
		onEdit: handleEdit,
		onDelete: handleDelete,
		onDarBaixa: handleDarBaixa,
		onVerDetalhes: handleVerDetalhes,
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

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Verifica se não está digitando em um input
			const isInputFocused =
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement;

			if (isInputFocused) return; // Ignora se e	ver digitando

			// F2 - Redireciona para Inclusão
			if (event.key === "F2") {
				event.preventDefault();
				router.push("/contas-receber/novo");
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [router]);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Contas a Receber</h1>
					<Button
						disabled={!empresa}
						onClick={() => router.push("/contas-receber/novo")}
						className="gap-2"
					>
						<IconPlus className="size-4" />
						Incluir (F2)
					</Button>
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as contas a receber
							</p>
						</div>
					) : isLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						</div>
					) : (
						<>
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<TableHead
													className={
														header.id === "valor" ||
														header.id === "saldo" ||
														header.id === "saldoSemJurosMulta"
															? "text-right"
															: header.id === "acoes"
																? "text-right"
																: ""
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
												Nenhuma conta a receber encontrada.
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

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir conta a receber</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja excluir esta conta a receber? Esta ação não
							pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? "Excluindo..." : "Excluir"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageContainer>
	);
}

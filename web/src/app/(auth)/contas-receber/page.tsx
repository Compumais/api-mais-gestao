"use client";

import {
	IconCheck,
	IconDotsVertical,
	IconEye,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	type RowSelectionState,
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
	FiltrosFinanceiroLista,
	type FiltrosFinanceiroState,
	filtrosFinanceiroAtivos,
	filtrosFinanceiroVazios,
} from "@/components/filtros-financeiro-lista";
import { ModalBaixaFinanceiro } from "@/components/modal-baixa-financeiro";
import { TableSkeleton } from "@/components/table-skeleton";
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
import { Checkbox } from "@/components/ui/checkbox";
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

const formatParcela = (
	parcela: number | null | undefined,
	totalParcelas: number | null | undefined,
) => {
	const atual = parcela && parcela > 0 ? parcela : 1;
	if (totalParcelas && totalParcelas > 1) {
		return `${atual}/${totalParcelas}`;
	}
	return String(atual);
};

const documentoPareceUuid = (valor: string) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		valor,
	);

const formatDocumento = (financeiro: Financeiro) => {
	const documento = financeiro.documento?.trim() ?? "";
	if (!documento || documentoPareceUuid(documento)) {
		return financeiro.historico?.trim() || "Venda PDV";
	}
	return documento;
};

const formatNome = (financeiro: Financeiro) =>
	financeiro.emitente?.trim() || financeiro.historico?.trim() || "-";

const podeDarBaixa = (financeiro: Financeiro) =>
	financeiro.status === "A" && !financeiro.baixa;

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
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Selecionar todos"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				disabled={!row.getCanSelect()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Selecionar documento"
			/>
		),
		enableSorting: false,
	},
	{
		accessorKey: "documento",
		header: "Documento",
		cell: ({ row }) => (
			<div className="font-medium">{formatDocumento(row.original)}</div>
		),
	},
	{
		accessorKey: "emitente",
		header: "Nome",
		cell: ({ row }) => (
			<div className="max-w-[220px] truncate">{formatNome(row.original)}</div>
		),
	},
	{
		id: "parcela",
		header: "Parcela",
		cell: ({ row }) => (
			<div>
				{formatParcela(row.original.parcela, row.original.totalparcelas)}
			</div>
		),
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
			const podeBaixar = podeDarBaixa(financeiro);

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
							{podeBaixar && (
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
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtros, setFiltros] = useState<FiltrosFinanceiroState>(
		filtrosFinanceiroVazios,
	);
	const [filtrosAplicados, setFiltrosAplicados] =
		useState<FiltrosFinanceiroState>(filtrosFinanceiroVazios);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [financeiroToDelete, setFinanceiroToDelete] = useState<string | null>(
		null,
	);
	const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
	const [idsParaBaixa, setIdsParaBaixa] = useState<string[]>([]);
	const [baixando, setBaixando] = useState(false);

	const { data, isLoading } = useQuery({
		queryKey: [
			"financeiro",
			"contas-receber",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosAplicados,
		],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await financeiroService.listar({
				tipo: "R",
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				emitente: filtrosAplicados.emitente || undefined,
				emissaoInicio: filtrosAplicados.emissaoInicio || undefined,
				emissaoFim: filtrosAplicados.emissaoFim || undefined,
				vencimentoInicio: filtrosAplicados.vencimentoInicio || undefined,
				vencimentoFim: filtrosAplicados.vencimentoFim || undefined,
				status: filtrosAplicados.status || undefined,
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

	const handleAbrirBaixa = (ids: string[]) => {
		if (ids.length === 0) return;
		setIdsParaBaixa(ids);
		setBaixaDialogOpen(true);
	};

	const handleDarBaixa = (id: string) => {
		handleAbrirBaixa([id]);
	};

	const handleConfirmBaixa = async (dataBaixa: string) => {
		setBaixando(true);
		let ok = 0;
		let falhas = 0;

		for (const id of idsParaBaixa) {
			try {
				await financeiroService.darBaixa(id, dataBaixa);
				ok += 1;
			} catch {
				falhas += 1;
			}
		}

		setBaixando(false);
		setBaixaDialogOpen(false);
		setIdsParaBaixa([]);
		setRowSelection({});
		void queryClient.invalidateQueries({ queryKey: ["financeiro"] });

		if (ok > 0) {
			toast.success(
				ok === 1
					? "Baixa realizada com sucesso!"
					: `${ok} baixas realizadas com sucesso!`,
			);
		}
		if (falhas > 0) {
			toast.error(
				falhas === 1
					? "Falha ao dar baixa em 1 documento"
					: `Falha ao dar baixa em ${falhas} documentos`,
			);
		}
	};

	const handleVerDetalhes = (id: string) => {
		router.push(`/contas-receber/${id}`);
	};

	const handleAplicarFiltros = () => {
		setFiltrosAplicados({ ...filtros });
		setPagination((p) => ({ ...p, pageIndex: 0 }));
		setRowSelection({});
	};

	const handleLimparFiltros = () => {
		setFiltros(filtrosFinanceiroVazios);
		setFiltrosAplicados(filtrosFinanceiroVazios);
		setPagination((p) => ({ ...p, pageIndex: 0 }));
		setRowSelection({});
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
			rowSelection,
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
		enableRowSelection: (row) => podeDarBaixa(row.original),
		getRowId: (row) => row.id,
	});

	const idsSelecionados = Object.keys(rowSelection).filter(
		(id) => rowSelection[id],
	);
	const comFiltros = filtrosFinanceiroAtivos(filtrosAplicados);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isInputFocused =
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement;

			if (isInputFocused) return;

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
					<div className="flex flex-wrap gap-2">
						{idsSelecionados.length > 0 && (
							<Button
								onClick={() => handleAbrirBaixa(idsSelecionados)}
								className="gap-2"
							>
								<IconCheck className="size-4" />
								Dar baixa ({idsSelecionados.length})
							</Button>
						)}
						<Button
							disabled={!empresa}
							onClick={() => router.push("/contas-receber/novo")}
							className="gap-2"
						>
							<IconPlus className="size-4" />
							Incluir (F2)
						</Button>
					</div>
				</div>

				<FiltrosFinanceiroLista
					filtros={filtros}
					onChange={setFiltros}
					onAplicar={handleAplicarFiltros}
					onLimpar={handleLimparFiltros}
					comFiltrosAtivos={comFiltros}
				/>

				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as contas a receber
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10} columns={12}>
							<TableCell className="w-10" />
							<TableCell>Documento</TableCell>
							<TableCell>Nome</TableCell>
							<TableCell>Parcela</TableCell>
							<TableCell>Status</TableCell>
							<TableCell>Emissão</TableCell>
							<TableCell>Vencimento</TableCell>
							<TableCell>Valor</TableCell>
							<TableCell>Saldo</TableCell>
							<TableCell className="w-24 text-end">
								Saldo sem juros/multa
							</TableCell>
							<TableCell>Tipo</TableCell>
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
											<TableRow
												key={row.id}
												data-state={row.getIsSelected() && "selected"}
											>
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

			<ModalBaixaFinanceiro
				open={baixaDialogOpen}
				onOpenChange={setBaixaDialogOpen}
				quantidade={idsParaBaixa.length}
				onConfirm={handleConfirmBaixa}
				isPending={baixando}
			/>
		</PageContainer>
	);
}

"use client";

import { IconPlus } from "@tabler/icons-react";
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
import { Ban, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
	type NotaFiscal,
	notaFiscalService,
} from "@/services/nota-fiscal.service";
import { PageContainer } from "../components/page-container";

const STATUS_CONFIRMADA = 1;
const STATUS_CANCELADA = 2;
const STATUS_RASCUNHO = 99;

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	const num = parseFloat(value);
	if (Number.isNaN(num)) return "R$ 0,00";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
};

const formatDate = (date: string | null | undefined) => {
	if (!date) return "-";
	return new Date(date).toLocaleDateString("pt-BR");
};

function statusBadge(status: number | null | undefined) {
	if (status === STATUS_CANCELADA) {
		return <Badge variant="destructive">Cancelada</Badge>;
	}
	if (status === STATUS_CONFIRMADA) {
		return <Badge className="bg-green-600">Confirmada</Badge>;
	}
	if (status === STATUS_RASCUNHO) {
		return <Badge variant="outline">Rascunho</Badge>;
	}
	if (status === null || status === undefined) {
		return <Badge variant="secondary">Registrada</Badge>;
	}
	return <Badge variant="secondary">{status}</Badge>;
}

type ColunasParams = {
	onCancelar: (nota: NotaFiscal) => void;
	cancelandoId?: string | null;
};

const createColumns = ({
	onCancelar,
	cancelandoId,
}: ColunasParams): ColumnDef<NotaFiscal>[] => [
	{
		accessorKey: "numero",
		header: "Número",
		cell: ({ row }) => (
			<div className="font-medium">
				{row.original.numero ?? row.original.numeronotafiscal ?? "-"}
			</div>
		),
	},
	{
		accessorKey: "serie",
		header: "Série",
		cell: ({ row }) => <div>{row.getValue("serie") ?? "-"}</div>,
	},
	{
		accessorKey: "razaosocial",
		header: "Fornecedor",
		cell: ({ row }) => (
			<div className="max-w-[200px] truncate">
				{row.getValue("razaosocial") ?? "-"}
			</div>
		),
	},
	{
		accessorKey: "emissao",
		header: "Emissão",
		cell: ({ row }) => <div>{formatDate(row.getValue("emissao"))}</div>,
	},
	{
		accessorKey: "entradasaida",
		header: "Entrada",
		cell: ({ row }) => <div>{formatDate(row.getValue("entradasaida"))}</div>,
	},
	{
		accessorKey: "valortotalnota",
		header: () => <div className="text-right">Valor total</div>,
		cell: ({ row }) => (
			<div className="text-right font-medium">
				{formatCurrency(row.getValue("valortotalnota"))}
			</div>
		),
	},
	{
		accessorKey: "chavenfe",
		header: "Chave NF-e",
		cell: ({ row }) => {
			const chave = row.getValue("chavenfe") as string | null;
			if (!chave) return <div>-</div>;
			return (
				<div className="max-w-[120px] truncate text-xs text-muted-foreground">
					{chave}
				</div>
			);
		},
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => statusBadge(row.getValue("status") as number | null),
	},
	{
		id: "acoes",
		header: "",
		cell: ({ row }) => {
			const nota = row.original;
			const cancelada = nota.status === STATUS_CANCELADA;
			const podeEditar = !cancelada && nota.status !== STATUS_RASCUNHO;
			const podeCancelar = !cancelada && nota.status !== STATUS_RASCUNHO;
			const podeDevolver =
				!!nota.chavenfe && !cancelada && nota.status !== STATUS_RASCUNHO;

			return (
				<div className="flex items-center justify-end gap-1">
					{podeEditar && (
						<Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
							<Link href={`/nota-fiscal-compra/${nota.id}/editar`}>
								<Pencil className="mr-1 size-3" />
								Editar
							</Link>
						</Button>
					)}
					{podeCancelar && (
						<Button
							size="sm"
							variant="outline"
							className="h-7 px-2 text-xs text-destructive border-destructive/30"
							disabled={cancelandoId === nota.id}
							onClick={() => onCancelar(nota)}
						>
							<Ban className="mr-1 size-3" />
							Cancelar
						</Button>
					)}
					{podeDevolver && (
						<Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
							<Link href={`/nota-fiscal-venda/nova?devolverEntrada=${nota.id}`}>
								<RotateCcw className="mr-1 size-3" />
								Devolver
							</Link>
						</Button>
					)}
				</div>
			);
		},
	},
];

export default function NotaFiscalCompraPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [notaCancelar, setNotaCancelar] = useState<NotaFiscal | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: [
			"notas-fiscais-compra",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await notaFiscalService.listar({
				idempresa: empresa.id,
				tipoorigem: 0,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			});
		},
		enabled: !!empresa,
	});

	const { data: rascunhos } = useQuery({
		queryKey: ["rascunhos-importacao-nf", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return notaFiscalService.listarRascunhosImportacao({
				idempresa: empresa.id,
				limit: 5,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: cancelarNota, isPending: cancelando } = useMutation({
		mutationFn: async (nota: NotaFiscal) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return notaFiscalService.cancelarCompra(nota.id, {
				idempresa: empresa.id,
				motivo: "Cancelamento interno da nota de compra",
			});
		},
		onSuccess: (resultado) => {
			toast.success(
				`Nota cancelada e removida. Estoque: ${resultado.movimentosEstornados} movimento(s), financeiro: ${resultado.titulosEstornados} título(s), custos: ${resultado.custosRemovidos}.`,
			);
			for (const aviso of resultado.avisos ?? []) {
				toast.warning(aviso);
			}
			queryClient.invalidateQueries({ queryKey: ["notas-fiscais-compra"] });
			setNotaCancelar(null);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cancelar nota fiscal");
		},
	});

	const columns = useMemo(
		() =>
			createColumns({
				onCancelar: setNotaCancelar,
				cancelandoId: cancelando ? notaCancelar?.id : null,
			}),
		[cancelando, notaCancelar?.id],
	);

	const table = useReactTable({
		data: data?.data || [],
		columns,
		state: { sorting, pagination },
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
					<h1 className="text-2xl font-bold">Nota fiscal de compra</h1>
					<div className="flex gap-2">
						<Button asChild variant="outline" disabled={!empresa}>
							<Link href="/nota-fiscal-compra/importar">Importar XML</Link>
						</Button>
						<Button asChild disabled={!empresa}>
							<Link href="/nota-fiscal-compra/nova">
								<IconPlus className="size-4" />
								Nova NF
							</Link>
						</Button>
					</div>
				</div>
				{rascunhos && rascunhos.data.length > 0 ? (
					<section className="mx-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
						<h2 className="font-semibold mb-2">Rascunhos pendentes</h2>
						<ul className="flex flex-col gap-2">
							{rascunhos.data.map((rascunho) => (
								<li key={rascunho.id}>
									<Link
										href={`/nota-fiscal-compra/rascunho/${rascunho.id}`}
										className="text-sm underline-offset-4 hover:underline"
									>
										NF {rascunho.numero ?? rascunho.numeronotafiscal ?? "-"}{" "}
										— {rascunho.razaosocial ?? "Fornecedor"} (
										{formatCurrency(rascunho.valortotalnota)})
									</Link>
								</li>
							))}
						</ul>
					</section>
				) : null}
				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as notas fiscais de compra
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10} columns={8}>
							<TableCell>Número</TableCell>
							<TableCell>Série</TableCell>
							<TableCell>Fornecedor</TableCell>
							<TableCell>Emissão</TableCell>
							<TableCell>Entrada</TableCell>
							<TableCell className="text-right">Valor total</TableCell>
							<TableCell>Chave NF-e</TableCell>
							<TableCell>Status</TableCell>
						</TableSkeleton>
					) : (
						<>
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id}>
											{headerGroup.headers.map((header) => {
												const isRightAligned =
													header.id === "valortotalnota";
												return (
													<TableHead
														key={header.id}
														className={isRightAligned ? "text-right" : ""}
													>
														{header.isPlaceholder
															? null
															: flexRender(
																	header.column.columnDef.header,
																	header.getContext(),
																)}
													</TableHead>
												);
											})}
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
												<div className="flex flex-col items-center gap-3">
													<p className="text-muted-foreground">
														Nenhuma nota fiscal de compra encontrada.
													</p>
													<Button asChild variant="outline" size="sm">
														<Link href="/nota-fiscal-compra/nova">
															<IconPlus className="size-4" />
															Incluir primeira NF
														</Link>
													</Button>
												</div>
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

			<AlertDialog
				open={!!notaCancelar}
				onOpenChange={(aberto) => {
					if (!aberto) setNotaCancelar(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancelar e apagar nota de compra?</AlertDialogTitle>
						<AlertDialogDescription>
							O estoque de entrada será estornado, os títulos a pagar sem baixa e
							os custos vinculados à nota serão removidos, e a nota será
							excluída permanentemente. Esta ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelando}>Voltar</AlertDialogCancel>
						<AlertDialogAction
							disabled={cancelando || !notaCancelar}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								if (notaCancelar) cancelarNota(notaCancelar);
							}}
						>
							{cancelando ? "Cancelando..." : "Confirmar e apagar"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageContainer>
	);
}

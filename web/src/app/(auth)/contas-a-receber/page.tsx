"use client";

import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
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
	
	const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
		"A": { label: "Aberto", variant: "default" },
		"P": { label: "Pago", variant: "secondary" },
		"C": { label: "Cancelado", variant: "destructive" },
		"V": { label: "Vencido", variant: "destructive" },
	};

	const statusInfo = statusMap[status] || { label: status, variant: "outline" as const };
	
	return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
};

const calculateSaldoSemJurosMulta = (financeiro: Financeiro) => {
	const saldo = parseFloat(financeiro.saldo || "0");
	const juros = financeiro.juros || 0;
	const multa = financeiro.multa || 0;
	return saldo - juros - multa;
};

const columns: ColumnDef<Financeiro>[] = [
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
		cell: ({ row }) => (
			<div>{row.getValue("emitente") || "-"}</div>
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
		cell: ({ row }) => (
			<div>{formatDate(row.getValue("emissao"))}</div>
		),
	},
	{
		accessorKey: "vencimento",
		header: "Vencimento",
		cell: ({ row }) => (
			<div>{formatDate(row.getValue("vencimento"))}</div>
		),
	},
	{
		accessorKey: "valor",
		header: () => <div className="text-right">Valor</div>,
		cell: ({ row }) => {
			const valor = row.getValue("valor") as string;
			return (
				<div className="text-right font-medium">
					{formatCurrency(valor)}
				</div>
			);
		},
	},
	{
		accessorKey: "saldo",
		header: () => <div className="text-right">Saldo</div>,
		cell: ({ row }) => {
			const saldo = row.getValue("saldo") as string;
			return (
				<div className="text-right font-medium">
					{formatCurrency(saldo)}
				</div>
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
];

export default function ContasAReceberPage() {
	const { empresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});

	const { data, isLoading } = useQuery({
		queryKey: [
			"financeiro",
			"contas-a-receber",
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
					<h1 className="text-2xl font-bold">Contas a Receber</h1>
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
		</PageContainer>
	);
}


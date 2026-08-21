"use client";

import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { TableSkeleton } from "@/components/table-skeleton";
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
	type RegistroProducao,
	producaoService,
} from "@/services/producao.service";

function formatarMoeda(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "—";
	return n.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}

function formatarQtd(valor: string) {
	const n = Number.parseFloat(valor);
	if (Number.isNaN(n)) return valor;
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
}

function formatarData(valor: string) {
	const data = new Date(valor);
	if (Number.isNaN(data.getTime())) return valor;
	return data.toLocaleString("pt-BR");
}

export default function ProducoesPage() {
	const { localStorageEmpresa } = useEmpresa();
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});

	const { data, isLoading } = useQuery({
		queryKey: [
			"producoes",
			localStorageEmpresa?.id,
			pagination.pageIndex,
			pagination.pageSize,
		],
		queryFn: () =>
			producaoService.listar({
				idempresa: localStorageEmpresa!.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			}),
		enabled: !!localStorageEmpresa?.id,
	});

	const columns: ColumnDef<RegistroProducao>[] = [
		{
			accessorKey: "datahora",
			header: "Data",
			cell: ({ row }) => formatarData(row.original.datahora),
		},
		{
			accessorKey: "nomeprodutoacabado",
			header: "Produto",
			cell: ({ row }) => (
				<div>
					<div>{row.original.nomeprodutoacabado ?? "—"}</div>
					<div className="text-xs text-muted-foreground tabular-nums">
						{row.original.codigoprodutoacabado ?? ""}
					</div>
				</div>
			),
		},
		{
			accessorKey: "quantidadeproduzida",
			header: "Qtd.",
			cell: ({ row }) => (
				<span className="tabular-nums">
					{formatarQtd(row.original.quantidadeproduzida)}
				</span>
			),
		},
		{
			accessorKey: "origem",
			header: "Origem",
			cell: ({ row }) =>
				row.original.origem === 0 ? (
					<Badge variant="secondary">Massa</Badge>
				) : (
					<Badge variant="secondary">Venda</Badge>
				),
		},
		{
			accessorKey: "custounitario",
			header: "Custo unit.",
			cell: ({ row }) => formatarMoeda(row.original.custounitario),
		},
		{
			accessorKey: "custototal",
			header: "Custo total",
			cell: ({ row }) => formatarMoeda(row.original.custototal),
		},
	];

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		pageCount: data?.paginacao.totalPages ?? 1,
		state: { pagination },
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 p-4">
				<h1 className="text-2xl font-bold">Produções</h1>
				<p className="text-sm text-muted-foreground">
					Histórico de execuções de ficha de produção (massa e venda).
				</p>

				{isLoading ? (
					<TableSkeleton columns={6} />
				) : (
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((hg) => (
									<TableRow key={hg.id}>
										{hg.headers.map((header) => (
											<TableHead key={header.id}>
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
								{table.getRowModel().rows.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className="h-24 text-center"
										>
											Nenhuma produção registrada
										</TableCell>
									</TableRow>
								) : (
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
								)}
							</TableBody>
						</Table>
					</div>
				)}

				<div className="flex items-center justify-end gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
					>
						Anterior
					</Button>
					<span className="text-sm text-muted-foreground">
						Página {pagination.pageIndex + 1} de{" "}
						{data?.paginacao.totalPages ?? 1}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
					>
						Próxima
					</Button>
				</div>
			</div>
		</PageContainer>
	);
}

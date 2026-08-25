"use client";

import { IconDotsVertical, IconEye } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
import {
	formatarMoeda,
	STATUS_PEDIDO_COMPRA,
} from "@/constants/compras-constants";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type PedidoCompra,
	pedidosCompraService,
} from "@/services/pedidos-compra.service";

export default function PedidosCompraPage() {
	const router = useRouter();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

	const { data, isLoading } = useQuery({
		queryKey: ["pedidos-compra", empresa?.id, pagination.pageIndex],
		queryFn: () =>
			pedidosCompraService.listar({
				idempresa: empresa!.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			}),
		enabled: !!empresa,
	});

	const columns: ColumnDef<PedidoCompra>[] = [
		{ accessorKey: "codigo", header: "Código" },
		{ accessorKey: "fornecedornome", header: "Fornecedor" },
		{ accessorKey: "fornecedortelefone", header: "Telefone" },
		{
			id: "cotacao",
			header: "Cotação",
			cell: ({ row }) =>
				row.original.cotacaocodigo
					? `#${row.original.cotacaocodigo} ${row.original.cotacaotitulo ?? ""}`
					: "—",
		},
		{
			accessorKey: "valortotal",
			header: "Total",
			cell: ({ row }) => formatarMoeda(row.original.valortotal),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = STATUS_PEDIDO_COMPRA[row.original.status];
				return (
					<Badge variant={status?.variant ?? "outline"}>
						{status?.label ?? row.original.status}
					</Badge>
				);
			},
		},
		{
			id: "acoes",
			header: "Ações",
			cell: ({ row }) => (
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<IconDotsVertical className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() =>
									router.push(`/compras/pedidos/${row.original.id}`)
								}
							>
								<IconEye className="size-4" />
								Visualizar
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			),
		},
	];

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		state: { pagination },
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Pedidos de compra</h1>
				</div>
				<div className="mx-4 rounded-lg border bg-card">
					{!empresa ? (
						<p className="p-8 text-center text-muted-foreground">
							Selecione uma empresa
						</p>
					) : isLoading ? (
						<TableSkeleton rows={8} columns={6} />
					) : (
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<TableHead key={header.id}>
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows.length ? (
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
										<TableCell colSpan={columns.length} className="h-24 text-center">
											Nenhum pedido de compra.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</div>
			</div>
		</PageContainer>
	);
}

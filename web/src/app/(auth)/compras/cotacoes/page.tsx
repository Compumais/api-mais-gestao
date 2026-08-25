"use client";

import {
	IconChartBar,
	IconDotsVertical,
	IconLink,
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
	useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
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
import { STATUS_COTACAO_COMPRA } from "@/constants/compras-constants";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CotacaoCompra,
	cotacoesCompraService,
} from "@/services/cotacoes-compra.service";

export default function CotacoesCompraPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
	const [filtroStatus, setFiltroStatus] = useState("todos");
	const [filtroQ, setFiltroQ] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: [
			"cotacoes-compra",
			empresa?.id,
			pagination.pageIndex,
			pagination.pageSize,
			filtroStatus,
			filtroQ,
		],
		queryFn: () =>
			cotacoesCompraService.listar({
				idempresa: empresa!.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				status: filtroStatus === "todos" ? undefined : filtroStatus,
				q: filtroQ || undefined,
			}),
		enabled: !!empresa,
	});

	const { mutate: abrir } = useMutation({
		mutationFn: cotacoesCompraService.abrir,
		onSuccess: (cotacao) => {
			queryClient.invalidateQueries({ queryKey: ["cotacoes-compra"] });
			toast.success("Cotação aberta. Copie o link para o fornecedor.");
			router.push(`/compras/cotacoes/${cotacao.id}`);
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const { mutate: excluir } = useMutation({
		mutationFn: cotacoesCompraService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cotacoes-compra"] });
			toast.success("Cotação excluída");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const columns: ColumnDef<CotacaoCompra>[] = [
		{
			accessorKey: "codigo",
			header: "Código",
		},
		{ accessorKey: "titulo", header: "Título" },
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = STATUS_COTACAO_COMPRA[row.original.status];
				return (
					<Badge variant={status?.variant ?? "outline"}>
						{status?.label ?? row.original.status}
					</Badge>
				);
			},
		},
		{
			accessorKey: "validade",
			header: "Validade",
			cell: ({ row }) => row.original.validade || "—",
		},
		{
			accessorKey: "totalpropostas",
			header: "Propostas",
		},
		{
			id: "acoes",
			header: "Ações",
			cell: ({ row }) => {
				const cotacao = row.original;
				return (
					<div className="flex justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<IconDotsVertical className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() => router.push(`/compras/cotacoes/${cotacao.id}`)}
								>
									<IconLink className="size-4" />
									Abrir detalhes
								</DropdownMenuItem>
								{cotacao.status === "R" && (
									<>
										<DropdownMenuItem
											onClick={() =>
												router.push(`/compras/cotacoes/${cotacao.id}/editar`)
											}
										>
											<IconPencil className="size-4" />
											Editar
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => abrir(cotacao.id)}>
											<IconLink className="size-4" />
											Abrir para fornecedores
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											variant="destructive"
											onClick={() =>
												toast.message("Excluir esta cotação?", {
													action: {
														label: "Excluir",
														onClick: () => excluir(cotacao.id),
													},
												})
											}
										>
											<IconTrash className="size-4" />
											Excluir
										</DropdownMenuItem>
									</>
								)}
								{(cotacao.status === "A" || cotacao.status === "E") && (
									<DropdownMenuItem
										onClick={() =>
											router.push(
												`/compras/cotacoes/${cotacao.id}/comparativo`,
											)
										}
									>
										<IconChartBar className="size-4" />
										Comparativo
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
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
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Cotações de compra</h1>
					<Button
						className="gap-2"
						onClick={() => router.push("/compras/cotacoes/novo")}
					>
						<IconPlus className="size-4" />
						Nova cotação
					</Button>
				</div>
				<div className="mx-4 rounded-lg border bg-card">
					{!empresa ? (
						<p className="p-8 text-center text-muted-foreground">
							Selecione uma empresa
						</p>
					) : (
						<>
							<div className="grid grid-cols-1 gap-4 border-b p-4 md:grid-cols-2">
								<Input
									placeholder="Filtrar por título..."
									value={filtroQ}
									onChange={(e) => {
										setFiltroQ(e.target.value);
										setPagination((p) => ({ ...p, pageIndex: 0 }));
									}}
								/>
								<Select
									value={filtroStatus}
									onValueChange={(value) => {
										setFiltroStatus(value);
										setPagination((p) => ({ ...p, pageIndex: 0 }));
									}}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todos os status</SelectItem>
										<SelectItem value="R">Rascunho</SelectItem>
										<SelectItem value="A">Aberta</SelectItem>
										<SelectItem value="E">Encerrada</SelectItem>
										<SelectItem value="C">Cancelada</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{isLoading ? (
								<TableSkeleton rows={8} columns={6} />
							) : (
								<>
									<Table>
										<TableHeader>
											{table.getHeaderGroups().map((headerGroup) => (
												<TableRow key={headerGroup.id}>
													{headerGroup.headers.map((header) => (
														<TableHead
															key={header.id}
															className={
																header.id === "acoes" ? "text-right" : ""
															}
														>
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
													<TableCell
														colSpan={columns.length}
														className="h-24 text-center"
													>
														Nenhuma cotação encontrada.
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
									{data && data.paginacao.totalPages > 1 && (
										<div className="flex items-center justify-between border-t px-4 py-4">
											<span className="text-sm text-muted-foreground">
												Página {pagination.pageIndex + 1} de{" "}
												{data.paginacao.totalPages}
											</span>
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

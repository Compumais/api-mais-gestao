"use client";

import { IconSearch } from "@tabler/icons-react";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
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
import { type Entidade, entidadesService } from "@/services/entidades.service";
import { PageContainer } from "../components/page-container";

const createColumns = (): ColumnDef<Entidade>[] => [
	{
		accessorKey: "nome",
		header: "Nome",
		cell: ({ row }) => <div>{row.getValue("nome")}</div>,
	},
	{
		accessorKey: "razaosocial",
		header: "Razão Social",
		cell: ({ row }) => <div>{row.getValue("razaosocial") || "-"}</div>,
	},
	{
		accessorKey: "cnpjcpf",
		header: "CNPJ/CPF",
		cell: ({ row }) => <div>{row.getValue("cnpjcpf")}</div>,
	},
	{
		accessorKey: "endereco",
		header: "Endereço",
		cell: ({ row }) => <div>{row.getValue("endereco") || "-"}</div>,
	},
];

export default function FornecedoresPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
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
		router.replace(query ? `/fornecedores?${query}` : "/fornecedores");
	};

	const { data, isLoading } = useQuery({
		queryKey: [
			"fornecedores",
			localStorageEmpresa?.id,
			qAplicado,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await entidadesService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(qAplicado ? { q: qAplicado } : {}),
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const columns = createColumns();

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
				<div className="flex items-center justify-start px-4">
					<h1 className="text-2xl font-bold">Fornecedores</h1>
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
						placeholder="Buscar por nome, razão social ou CNPJ/CPF..."
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
				<div className="rounded-lg border bg-card mx-4">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os fornecedores
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10} columns={4}>
							<TableHead>Nome</TableHead>
							<TableHead>Razão Social</TableHead>
							<TableHead className="w-[180px]">CNPJ/CPF</TableHead>
							<TableHead className="w-[180px]">Endereço</TableHead>
						</TableSkeleton>
					) : (
						<>
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
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
												Nenhum fornecedor encontrado.
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

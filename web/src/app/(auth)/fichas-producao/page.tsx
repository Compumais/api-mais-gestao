"use client";

import {
	IconBuildingFactory,
	IconDotsVertical,
	IconPencil,
	IconPlus,
	IconSearch,
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
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type FichaProducao,
	fichaProducaoService,
} from "@/services/ficha-producao.service";
import { ProduzirFichaDialog } from "./components/produzir-ficha-dialog";

export default function FichasProducaoPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const qAplicado = searchParams.get("q")?.trim() ?? "";
	const [qInput, setQInput] = useState(qAplicado);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [fichaProduzir, setFichaProduzir] = useState<FichaProducao | null>(
		null,
	);
	const [dialogAberto, setDialogAberto] = useState(false);

	useEffect(() => {
		setQInput(qAplicado);
	}, [qAplicado]);

	const { data, isLoading } = useQuery({
		queryKey: [
			"fichas-producao",
			localStorageEmpresa?.id,
			qAplicado,
			pagination.pageIndex,
			pagination.pageSize,
		],
		queryFn: () =>
			fichaProducaoService.listar({
				idempresa: localStorageEmpresa!.id,
				q: qAplicado || undefined,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			}),
		enabled: !!localStorageEmpresa?.id,
	});

	const { mutate: excluir } = useMutation({
		mutationFn: fichaProducaoService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fichas-producao"] });
			toast.success("Ficha excluída");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir");
		},
	});

	async function abrirProducao(ficha: FichaProducao) {
		try {
			const completa = await fichaProducaoService.buscar(ficha.id);
			setFichaProduzir(completa);
			setDialogAberto(true);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Falha ao carregar ficha",
			);
		}
	}

	const columns: ColumnDef<FichaProducao>[] = [
		{
			accessorKey: "codigoprodutoacabado",
			header: "Código",
			cell: ({ row }) => (
				<div className="tabular-nums">
					{row.original.codigoprodutoacabado ?? "—"}
				</div>
			),
		},
		{
			accessorKey: "nomeprodutoacabado",
			header: "Produto acabado",
			cell: ({ row }) => row.original.nomeprodutoacabado ?? "—",
		},
		{
			id: "modos",
			header: "Modos",
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.permiteproducaomassa === 1 && (
						<Badge variant="secondary">Massa</Badge>
					)}
					{row.original.producaonavenda === 1 && (
						<Badge variant="secondary">Na venda</Badge>
					)}
				</div>
			),
		},
		{
			accessorKey: "ativo",
			header: "Status",
			cell: ({ row }) =>
				row.original.ativo === 1 ? (
					<Badge>Ativa</Badge>
				) : (
					<Badge variant="outline">Inativa</Badge>
				),
		},
		{
			id: "acoes",
			header: "Ações",
			cell: ({ row }) => {
				const ficha = row.original;
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
								{ficha.permiteproducaomassa === 1 && ficha.ativo === 1 && (
									<DropdownMenuItem onClick={() => abrirProducao(ficha)}>
										<IconBuildingFactory className="size-4" />
										Produzir
									</DropdownMenuItem>
								)}
								<DropdownMenuItem
									onClick={() =>
										router.push(`/fichas-producao/${ficha.id}/editar`)
									}
								>
									<IconPencil className="size-4" />
									Editar
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() => {
										if (confirm("Excluir esta ficha de produção?")) {
											excluir(ficha.id);
										}
									}}
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

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		pageCount: data?.paginacao.totalPages ?? 1,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
	});

	function aplicarBusca() {
		const params = new URLSearchParams();
		if (qInput.trim()) params.set("q", qInput.trim());
		router.replace(
			params.toString()
				? `/fichas-producao?${params}`
				: "/fichas-producao",
		);
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 p-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h1 className="text-2xl font-bold">Fichas de produção</h1>
					<Button onClick={() => router.push("/fichas-producao/novo")}>
						<IconPlus className="size-4" />
						Nova ficha
					</Button>
				</div>

				<form
					className="flex gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						aplicarBusca();
					}}
				>
					<div className="relative max-w-sm flex-1">
						<IconSearch className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="pl-8"
							placeholder="Buscar produto..."
							value={qInput}
							onChange={(e) => setQInput(e.target.value)}
						/>
					</div>
					<Button type="submit" variant="secondary">
						Buscar
					</Button>
				</form>

				{isLoading ? (
					<TableSkeleton columns={5} />
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
											Nenhuma ficha encontrada
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

			<ProduzirFichaDialog
				aberto={dialogAberto}
				onAbertoChange={setDialogAberto}
				ficha={fichaProduzir}
			/>
		</PageContainer>
	);
}

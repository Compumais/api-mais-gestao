"use client";

import {
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
import { useState } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
	type GrupoGourmet,
	gruposGourmetService,
} from "@/services/grupos-gourmet.service";
import { PageContainer } from "../components/page-container";

type ColumnsProps = {
	onEdit: (grupo: GrupoGourmet) => void;
	onDelete: (id: string) => void;
};

const createColumns = ({
	onEdit,
	onDelete,
}: ColumnsProps): ColumnDef<GrupoGourmet>[] => [
	{
		accessorKey: "codigo",
		header: "Código",
		cell: ({ row }) => <div>{row.getValue("codigo") || "-"}</div>,
	},
	{
		accessorKey: "nome",
		header: "Nome",
		cell: ({ row }) => <div>{row.getValue("nome") || "-"}</div>,
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const grupo = row.original;
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
							<DropdownMenuItem onClick={() => onEdit(grupo)}>
								<IconPencil className="size-4" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => onDelete(grupo.id)}
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

export default function GruposGourmetPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { empresa: localStorageEmpresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [qInput, setQInput] = useState(searchParams.get("q") ?? "");
	const qAplicado = searchParams.get("q") ?? "";

	const handleBuscar = () => {
		const params = new URLSearchParams();
		const termo = qInput.trim();
		if (termo) {
			params.set("q", termo);
		}
		const query = params.toString();
		router.replace(query ? `/grupos-gourmet?${query}` : "/grupos-gourmet");
	};

	const { data, isLoading } = useQuery({
		queryKey: [
			"grupos-gourmet",
			localStorageEmpresa?.id,
			qAplicado,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await gruposGourmetService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(qAplicado ? { q: qAplicado } : {}),
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletar } = useMutation({
		mutationFn: gruposGourmetService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["grupos-gourmet"] });
			toast.success("Grupo gourmet excluído");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir grupo gourmet");
		},
	});

	const columns = createColumns({
		onEdit: (grupo) => router.push(`/grupos-gourmet/${grupo.id}/editar`),
		onDelete: (id) => {
			toast.message("Tem certeza que deseja excluir este grupo gourmet?", {
				position: "top-center",
				duration: 3000,
				action: {
					label: "Excluir",
					onClick: () => deletar(id),
				},
				description: "Esta ação não pode ser desfeita.",
			});
		},
	});

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
					<h1 className="text-2xl font-bold">Grupos gourmet</h1>
					<Button
						onClick={() => router.push("/grupos-gourmet/novo")}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Cadastrar grupo gourmet
					</Button>
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
						placeholder="Buscar por nome ou código..."
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
				<div className="mx-4 rounded-lg border bg-card">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os grupos gourmet
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton columns={3} rows={6} />
					) : (
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
											Nenhum grupo gourmet cadastrado.
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

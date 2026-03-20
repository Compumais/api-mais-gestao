"use client";

import {
	IconDotsVertical,
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
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/table-skeleton";
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
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { type Usuario, usuariosService } from "@/services/usuarios.service";
import { PageContainer } from "../components/page-container";

type ColumnsProps = {
	onEdit: (usuario: Usuario) => void;
	onDelete: (id: string) => void;
	usuarioAutenticadoId: string | null;
};

const createColumns = ({
	onEdit,
	onDelete,
	usuarioAutenticadoId,
}: ColumnsProps): ColumnDef<Usuario>[] => [
	{
		accessorKey: "nome",
		header: "Nome",
		cell: ({ row }) => <div>{row.getValue("nome")}</div>,
	},
	{
		accessorKey: "email",
		header: "Email",
		cell: ({ row }) => <div>{row.getValue("email")}</div>,
	},
	{
		accessorKey: "perfil",
		header: "Perfil",
		cell: ({ row }) => {
			const perfil = row.getValue("perfil") as string | string[];
			const perfilStr = Array.isArray(perfil)
				? perfil[0] || "usuario"
				: perfil || "usuario";
			return <div className="capitalize">{perfilStr}</div>;
		},
	},
	{
		accessorKey: "emailverificado",
		header: "Email Verificado",
		cell: ({ row }) => {
			const verificado = row.getValue("emailverificado") as boolean;
			return (
				<div className={verificado ? "text-green-600" : "text-red-600"}>
					{verificado ? "Sim" : "Não"}
				</div>
			);
		},
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const usuario = row.original;
			const isUsuarioAutenticado = usuarioAutenticadoId === usuario.id;
			return (
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								aria-label="Abrir menu de ações"
								disabled={isUsuarioAutenticado}
							>
								<IconDotsVertical className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => onEdit(usuario)}
								disabled={isUsuarioAutenticado}
							>
								<IconPencil className="size-4" />
								Editar
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => onDelete(usuario.id)}
								disabled={isUsuarioAutenticado}
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

export default function UsuariosPage() {
	const router = useRouter();
	const { localStorageEmpresa } = useEmpresa();
	const { user } = useAuth();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});

	const { data, isLoading } = useQuery({
		queryKey: [
			"usuarios",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await usuariosService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const queryClient = useQueryClient();

	const { mutate: deletarUsuario } = useMutation({
		mutationFn: (id: string) =>
			usuariosService.deletar(id, localStorageEmpresa!.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["usuarios"] });
			toast.success("Usuário excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir usuário");
		},
	});

	const handleEdit = (usuario: Usuario) => {
		router.push(`/usuarios/${usuario.id}/editar`);
	};

	const handleDelete = (id: string) => {
		toast.message("Tem certeza que deseja excluir este usuário?", {
			position: "top-center",
			duration: 3000,
			action: {
				label: "Excluir",
				onClick: () => {
					deletarUsuario(id);
				},
			},
			description: "Esta ação não pode ser desfeita.",
		});
	};

	const columns = createColumns({
		onEdit: handleEdit,
		onDelete: handleDelete,
		usuarioAutenticadoId: user?.id || null,
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
					<h1 className="text-2xl font-bold">Usuários</h1>
					<Button
						onClick={() => router.push("/usuarios/novo")}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Incluir Novo Usuário
					</Button>
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os usuários
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10} columns={5}>
							<TableCell>Nome</TableCell>
							<TableCell>Email</TableCell>
							<TableCell className="w-28">Perfil</TableCell>
							<TableCell className="w-[180px]">Email Verificado</TableCell>
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
													className={header.id === "acoes" ? "text-right" : ""}
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
												Nenhum usuário encontrado.
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

"use client";

import { IconEye } from "@tabler/icons-react";
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
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	type Auditoria,
	auditoriaService,
} from "@/services/auditoria.service";
import { PageContainer } from "../components/page-container";

dayjs.locale("pt-br");

type ColumnsProps = {
	onViewDetails: (auditoria: Auditoria) => void;
};

const createColumns = ({
	onViewDetails,
}: ColumnsProps): ColumnDef<Auditoria>[] => [
	{
		accessorKey: "acao",
		header: "Ação",
		cell: ({ row }) => (
			<div className="font-medium">{row.getValue("acao")}</div>
		),
	},
	{
		accessorKey: "recurso",
		header: "Recurso",
		cell: ({ row }) => <div>{row.getValue("recurso")}</div>,
	},
	{
		accessorKey: "idrecurso",
		header: "ID Recurso",
		cell: ({ row }) => (
			<div className="text-muted-foreground">
				{row.getValue("idrecurso") || "-"}
			</div>
		),
	},
	{
		accessorKey: "criadoem",
		header: "Data/Hora",
		cell: ({ row }) => {
			const data = row.getValue("criadoem") as string;
			return (
				<div>
					{dayjs(data).format("DD/MM/YYYY HH:mm:ss")}
				</div>
			);
		},
	},
	{
		id: "acoes",
		header: "Ações",
		cell: ({ row }) => {
			const auditoria = row.original;
			return (
				<div className="flex justify-end">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onViewDetails(auditoria)}
						className="gap-2"
					>
						<IconEye className="size-4" />
						Ver Detalhes
					</Button>
				</div>
			);
		},
	},
];

export default function AuditoriaPage() {
	const { localStorageEmpresa } = useEmpresa();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [selectedAuditoria, setSelectedAuditoria] =
		useState<Auditoria | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const { data, isLoading } = useQuery({
		queryKey: [
			"auditoria",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await auditoriaService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const handleViewDetails = (auditoria: Auditoria) => {
		setSelectedAuditoria(auditoria);
		setIsDialogOpen(true);
	};

	const columns = createColumns({
		onViewDetails: handleViewDetails,
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
					<h1 className="text-2xl font-bold">Auditoria</h1>
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os logs de auditoria
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
														header.id === "acoes" ? "text-right" : ""
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
												Nenhum log de auditoria encontrado.
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

				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Detalhes da Auditoria</DialogTitle>
							<DialogDescription>
								Informações completas do log de auditoria
							</DialogDescription>
						</DialogHeader>
						{selectedAuditoria && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											ID
										</label>
										<p className="text-sm">{selectedAuditoria.id}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											Ação
										</label>
										<p className="text-sm font-medium">
											{selectedAuditoria.acao}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											Recurso
										</label>
										<p className="text-sm">{selectedAuditoria.recurso}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											ID Recurso
										</label>
										<p className="text-sm">
											{selectedAuditoria.idrecurso || "-"}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											ID Usuário
										</label>
										<p className="text-sm">
											{selectedAuditoria.idusuario || "-"}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											ID Empresa
										</label>
										<p className="text-sm">
											{selectedAuditoria.idempresa || "-"}
										</p>
									</div>
									<div className="col-span-2">
										<label className="text-sm font-medium text-muted-foreground">
											Data/Hora
										</label>
										<p className="text-sm">
											{dayjs(selectedAuditoria.criadoem).format(
												"DD/MM/YYYY [às] HH:mm:ss",
											)}
										</p>
									</div>
									{selectedAuditoria.metadados && (
										<div className="col-span-2">
											<label className="text-sm font-medium text-muted-foreground">
												Metadados
											</label>
											<pre className="mt-2 rounded-md bg-muted p-4 text-xs overflow-x-auto">
												{JSON.stringify(selectedAuditoria.metadados, null, 2)}
											</pre>
										</div>
									)}
								</div>
							</div>
						)}
					</DialogContent>
				</Dialog>
			</div>
		</PageContainer>
	);
}


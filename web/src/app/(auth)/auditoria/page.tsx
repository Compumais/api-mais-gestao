"use client";

import { IconChevronDown, IconLayoutColumns } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { useCallback, useId, useMemo, useState } from "react";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	TABELA_AUDITORIA,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	formatarAcaoAuditoria,
	formatarRecursoAuditoria,
} from "@/lib/auditoria-utils";
import { type Auditoria, auditoriaService } from "@/services/auditoria.service";
import { PageContainer } from "../components/page-container";
import {
	COLUNA_PARA_CAMPO_FILTRO_AUDITORIA,
	type ConfigFiltroColunaAuditoria,
	criarColunasAuditoria,
	type FiltrosColunaAuditoriaState,
	filtrosColunaAuditoriaVazios,
	visibilidadePadraoColunasAuditoria,
} from "./auditoria-colunas";

dayjs.locale("pt-br");

function rotuloColuna(column: {
	id: string;
	columnDef: { meta?: unknown; header?: unknown };
}) {
	const meta = column.columnDef.meta as { label?: string } | undefined;
	if (meta?.label) return meta.label;
	if (typeof column.columnDef.header === "string") {
		return column.columnDef.header;
	}
	return column.id;
}

function filtrosColunaAtivos(filtros: FiltrosColunaAuditoriaState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function AuditoriaPage() {
	const { localStorageEmpresa } = useEmpresa();
	const idPorPagina = useId();
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaAuditoriaState>(filtrosColunaAuditoriaVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
	const [selectedAuditoria, setSelectedAuditoria] = useState<Auditoria | null>(
		null,
	);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasAuditoria(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_AUDITORIA, visibilidadePadrao);

	const onOrdenarColuna = useCallback(
		(colunaId: string, direcao: OrdenacaoColunaTabela) => {
			if (!direcao) {
				setOrdenarPor(null);
				setOrdem(null);
			} else {
				setOrdenarPor(colunaId);
				setOrdem(direcao);
			}
			setPagination((p) => ({ ...p, pageIndex: 0 }));
		},
		[],
	);

	const onFiltrarColuna = useCallback((colunaId: string, valor: string) => {
		const campo = COLUNA_PARA_CAMPO_FILTRO_AUDITORIA[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaAuditoria
	> => {
		return {
			acao: { tipo: "texto", placeholder: "Ação" },
			recurso: { tipo: "texto", placeholder: "Recurso" },
			nomeusuario: { tipo: "texto", placeholder: "Usuário" },
			criadoem: { tipo: "data" },
			idrecurso: { tipo: "texto", placeholder: "ID recurso" },
			nomeempresa: { tipo: "texto", placeholder: "Empresa" },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"auditoria",
			localStorageEmpresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await auditoriaService.listar({
				idempresa: localStorageEmpresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.acao ? { acao: filtrosColuna.acao } : {}),
				...(filtrosColuna.recurso ? { recurso: filtrosColuna.recurso } : {}),
				...(filtrosColuna.nomeusuario
					? { nomeusuario: filtrosColuna.nomeusuario }
					: {}),
				...(filtrosColuna.criadoem
					? { criadoem: filtrosColuna.criadoem }
					: {}),
				...(filtrosColuna.idrecurso
					? { idrecurso: filtrosColuna.idrecurso }
					: {}),
				...(filtrosColuna.nomeempresa
					? { nomeempresa: filtrosColuna.nomeempresa }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const handleViewDetails = useCallback((auditoria: Auditoria) => {
		setSelectedAuditoria(auditoria);
		setIsDialogOpen(true);
	}, []);

	const columns = useMemo(
		() =>
			criarColunasAuditoria({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				onViewDetails: handleViewDetails,
			}),
		[
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
			handleViewDetails,
		],
	);

	const table = useReactTable({
		data: data?.data || [],
		columns,
		state: {
			pagination,
			columnVisibility,
		},
		onPaginationChange: setPagination,
		onColumnVisibilityChange,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const colunasVisiveis = table.getVisibleLeafColumns();
	const mostrarSkeleton = isLoading || isLoadingPreferencias;
	const comFiltros = filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Auditoria</h1>
					{localStorageEmpresa && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm">
									<IconLayoutColumns className="size-4" />
									<span className="hidden lg:inline">Personalizar Colunas</span>
									<span className="lg:hidden">Colunas</span>
									<IconChevronDown className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="max-h-72 w-56 overflow-y-auto"
							>
								{table
									.getAllColumns()
									.filter((column) => column.getCanHide())
									.map((column) => (
										<DropdownMenuCheckboxItem
											key={column.id}
											checked={column.getIsVisible()}
											onCheckedChange={(value) =>
												column.toggleVisibility(!!value)
											}
										>
											{rotuloColuna(column)}
										</DropdownMenuCheckboxItem>
									))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
				<div className="rounded-lg border bg-card mx-4">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os logs de auditoria
							</p>
						</div>
					) : mostrarSkeleton ? (
						<TableSkeleton
							rows={10}
							columns={colunasVisiveis.length || 5}
						>
							{colunasVisiveis.map((coluna) => (
								<TableHead
									key={coluna.id}
									className={coluna.id === "acoes" ? "w-36 text-end" : undefined}
								>
									{rotuloColuna(coluna)}
								</TableHead>
							))}
						</TableSkeleton>
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
												colSpan={colunasVisiveis.length}
												className="h-24 text-center"
											>
												{comFiltros
													? "Nenhum log de auditoria encontrado para os filtros selecionados."
													: "Nenhum log de auditoria encontrado."}
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
							{data && data.paginacao.total > 0 && (
								<div className="flex flex-col gap-4 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-center gap-2">
										<Label htmlFor={idPorPagina} className="text-sm">
											Itens por página
										</Label>
										<Select
											value={`${pagination.pageSize}`}
											onValueChange={(value) => {
												table.setPageSize(Number(value));
												table.setPageIndex(0);
											}}
										>
											<SelectTrigger id={idPorPagina} className="h-8 w-[72px]">
												<SelectValue placeholder={pagination.pageSize} />
											</SelectTrigger>
											<SelectContent side="top">
												{[10, 20, 30, 50, 100].map((tamanho) => (
													<SelectItem key={tamanho} value={`${tamanho}`}>
														{tamanho}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
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
											{formatarAcaoAuditoria(selectedAuditoria.acao)}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											Recurso
										</label>
										<p className="text-sm">
											{formatarRecursoAuditoria(selectedAuditoria.recurso)}
										</p>
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
											Usuário
										</label>
										<p className="text-sm">
											{selectedAuditoria.nomeusuario || "-"}
										</p>
									</div>
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											Empresa
										</label>
										<p className="text-sm">
											{selectedAuditoria.nomeempresa || "-"}
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
									{selectedAuditoria.metadados ? (
										<div className="col-span-2">
											<label className="text-sm font-medium text-muted-foreground">
												Metadados
											</label>
											<pre className="mt-2 rounded-md bg-muted p-4 text-xs overflow-x-auto">
												{JSON.stringify(selectedAuditoria.metadados, null, 2)}
											</pre>
										</div>
									) : (
										<div className="col-span-2">
											<label className="text-sm font-medium text-muted-foreground">
												Metadados
											</label>
											<p className="text-sm">-</p>
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

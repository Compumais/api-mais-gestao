"use client";

import {
	IconChevronDown,
	IconLayoutColumns,
	IconPlus,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { TableSkeleton } from "@/components/table-skeleton";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
	TABELA_NOTA_FISCAL_COMPRA,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type NotaFiscal,
	notaFiscalService,
} from "@/services/nota-fiscal.service";
import { PageContainer } from "../components/page-container";
import {
	COLUNA_PARA_CAMPO_FILTRO_NF_COMPRA,
	type ConfigFiltroColunaNotaFiscalCompra,
	criarColunasNotaFiscalCompra,
	type FiltrosColunaNotaFiscalCompraState,
	filtrosColunaNotaFiscalCompraVazios,
	STATUS_COMPRA_OPCOES_FILTRO,
	visibilidadePadraoColunasNotaFiscalCompra,
} from "./nota-fiscal-compra-colunas";

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	const num = parseFloat(value);
	if (Number.isNaN(num)) return "R$ 0,00";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
};

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

function filtrosColunaAtivos(filtros: FiltrosColunaNotaFiscalCompraState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function NotaFiscalCompraPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const idPorPagina = useId();
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [notaCancelar, setNotaCancelar] = useState<NotaFiscal | null>(null);
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaNotaFiscalCompraState>(
			filtrosColunaNotaFiscalCompraVazios,
		);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasNotaFiscalCompra(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_NOTA_FISCAL_COMPRA, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_NF_COMPRA[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaNotaFiscalCompra
	> => {
		return {
			numero: { tipo: "texto", placeholder: "Número" },
			serie: { tipo: "texto", placeholder: "Série" },
			razaosocial: { tipo: "texto", placeholder: "Fornecedor" },
			emissao: { tipo: "data" },
			entradasaida: { tipo: "data" },
			valortotalnota: { tipo: "nenhum" },
			chavenfe: { tipo: "texto", placeholder: "Chave" },
			status: { tipo: "opcoes", opcoes: STATUS_COMPRA_OPCOES_FILTRO },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"notas-fiscais-compra",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: async () => {
			if (!empresa) {
				throw new Error("Empresa não selecionada");
			}
			return await notaFiscalService.listar({
				idempresa: empresa.id,
				tipoorigem: 0,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.numero ? { numero: filtrosColuna.numero } : {}),
				...(filtrosColuna.serie ? { serie: filtrosColuna.serie } : {}),
				...(filtrosColuna.razaosocial
					? { razaosocial: filtrosColuna.razaosocial }
					: {}),
				...(filtrosColuna.emissao
					? {
							dataInicio: filtrosColuna.emissao,
							dataFim: filtrosColuna.emissao,
						}
					: {}),
				...(filtrosColuna.entradasaida
					? { entradasaida: filtrosColuna.entradasaida }
					: {}),
				...(filtrosColuna.chavenfe
					? { chavenfe: filtrosColuna.chavenfe }
					: {}),
				...(filtrosColuna.status
					? { status: Number(filtrosColuna.status) }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!empresa,
	});

	const { data: rascunhos } = useQuery({
		queryKey: ["rascunhos-importacao-nf", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return notaFiscalService.listarRascunhosImportacao({
				idempresa: empresa.id,
				limit: 5,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: cancelarNota, isPending: cancelando } = useMutation({
		mutationFn: async (nota: NotaFiscal) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return notaFiscalService.cancelarCompra(nota.id, {
				idempresa: empresa.id,
				motivo: "Cancelamento interno da nota de compra",
			});
		},
		onSuccess: (resultado) => {
			toast.success(
				`Nota cancelada e removida. Estoque: ${resultado.movimentosEstornados} movimento(s), financeiro: ${resultado.titulosEstornados} título(s), custos: ${resultado.custosRemovidos}.`,
			);
			for (const aviso of resultado.avisos ?? []) {
				toast.warning(aviso);
			}
			queryClient.invalidateQueries({ queryKey: ["notas-fiscais-compra"] });
			setNotaCancelar(null);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao cancelar nota fiscal");
		},
	});

	const columns = useMemo(
		() =>
			criarColunasNotaFiscalCompra({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				onCancelar: setNotaCancelar,
				cancelandoId: cancelando ? notaCancelar?.id : null,
			}),
		[
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
			cancelando,
			notaCancelar?.id,
		],
	);

	const table = useReactTable({
		data: data?.data || [],
		columns,
		state: { pagination, columnVisibility },
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
					<h1 className="text-2xl font-bold">Nota fiscal de compra</h1>
					<div className="flex flex-wrap gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" disabled={!empresa}>
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
						<Button asChild variant="outline" disabled={!empresa}>
							<Link href="/nota-fiscal-compra/importar">Importar XML</Link>
						</Button>
						<Button asChild disabled={!empresa}>
							<Link href="/nota-fiscal-compra/nova">
								<IconPlus className="size-4" />
								Nova NF
							</Link>
						</Button>
					</div>
				</div>
				{rascunhos && rascunhos.data.length > 0 ? (
					<section className="mx-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
						<h2 className="font-semibold mb-2">Rascunhos pendentes</h2>
						<ul className="flex flex-col gap-2">
							{rascunhos.data.map((rascunho) => (
								<li key={rascunho.id}>
									<Link
										href={`/nota-fiscal-compra/rascunho/${rascunho.id}`}
										className="text-sm underline-offset-4 hover:underline"
									>
										NF {rascunho.numero ?? rascunho.numeronotafiscal ?? "-"} —{" "}
										{rascunho.razaosocial ?? "Fornecedor"} (
										{formatCurrency(rascunho.valortotalnota)})
									</Link>
								</li>
							))}
						</ul>
					</section>
				) : null}
				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as notas fiscais de compra
							</p>
						</div>
					) : mostrarSkeleton ? (
						<TableSkeleton
							rows={10}
							columns={colunasVisiveis.length || 8}
						>
							{colunasVisiveis.map((coluna) => (
								<TableHead key={coluna.id}>{rotuloColuna(coluna)}</TableHead>
							))}
						</TableSkeleton>
					) : (
						<>
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id}>
											{headerGroup.headers.map((header) => {
												const isRightAligned =
													header.id === "valortotalnota";
												return (
													<TableHead
														key={header.id}
														className={isRightAligned ? "text-right" : ""}
													>
														{header.isPlaceholder
															? null
															: flexRender(
																	header.column.columnDef.header,
																	header.getContext(),
																)}
													</TableHead>
												);
											})}
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
												{comFiltros ? (
													<p className="text-muted-foreground">
														Nenhuma nota fiscal encontrada para os filtros
														selecionados.
													</p>
												) : (
													<div className="flex flex-col items-center gap-3">
														<p className="text-muted-foreground">
															Nenhuma nota fiscal de compra encontrada.
														</p>
														<Button asChild variant="outline" size="sm">
															<Link href="/nota-fiscal-compra/nova">
																<IconPlus className="size-4" />
																Incluir primeira NF
															</Link>
														</Button>
													</div>
												)}
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
			</div>

			<AlertDialog
				open={!!notaCancelar}
				onOpenChange={(aberto) => {
					if (!aberto) setNotaCancelar(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Cancelar e apagar nota de compra?
						</AlertDialogTitle>
						<AlertDialogDescription>
							O estoque de entrada será estornado, os títulos a pagar sem baixa e
							os custos vinculados à nota serão removidos, e a nota será
							excluída permanentemente. Esta ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelando}>Voltar</AlertDialogCancel>
						<AlertDialogAction
							disabled={cancelando || !notaCancelar}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								if (notaCancelar) cancelarNota(notaCancelar);
							}}
						>
							{cancelando ? "Cancelando..." : "Confirmar e apagar"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageContainer>
	);
}

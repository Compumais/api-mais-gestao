"use client";

import { IconChevronDown, IconLayoutColumns } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { TableSkeleton } from "@/components/table-skeleton";
import {
	AlertDialog,
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
import { Textarea } from "@/components/ui/textarea";
import { NFE_STATUS } from "@/constants/nfe-status";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	TABELA_NOTA_FISCAL_SERVICO,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import { nfseConfiguracaoService } from "@/services/nfse-configuracao.service";
import {
	cancelarNfse,
	consultarNfsePorRps,
	listarNfsesEmitidas,
	type NotaFiscalServico,
	retransmitirNfse,
} from "@/services/nfse-emissao.service";
import { PageContainer } from "../components/page-container";
import { AvisoAmbienteNfse } from "./components/aviso-ambiente-nfse";
import {
	COLUNA_PARA_CAMPO_FILTRO_NF_SERVICO,
	type ConfigFiltroColunaNotaFiscalServico,
	criarColunasNotaFiscalServico,
	type FiltrosColunaNotaFiscalServicoState,
	filtrosColunaNotaFiscalServicoVazios,
	NFSE_STATUS_OPCOES_FILTRO,
	visibilidadePadraoColunasNotaFiscalServico,
} from "./nota-fiscal-servico-colunas";

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

function filtrosColunaAtivos(filtros: FiltrosColunaNotaFiscalServicoState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function NotaFiscalServicoPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const idPorPagina = useId();
	const [notaCancelar, setNotaCancelar] = useState<NotaFiscalServico | null>(
		null,
	);
	const [motivoCancelamento, setMotivoCancelamento] = useState("");
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaNotaFiscalServicoState>(
			filtrosColunaNotaFiscalServicoVazios,
		);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasNotaFiscalServico(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_NOTA_FISCAL_SERVICO, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_NF_SERVICO[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaNotaFiscalServico
	> => {
		return {
			numeronotafiscal: { tipo: "texto", placeholder: "RPS" },
			numeronfse: { tipo: "texto", placeholder: "NFS-e" },
			razaosocial: { tipo: "texto", placeholder: "Tomador" },
			dataEmissao: { tipo: "data" },
			valortotalnota: { tipo: "nenhum" },
			status: { tipo: "opcoes", opcoes: NFSE_STATUS_OPCOES_FILTRO },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"nfse-emissao",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: () =>
			listarNfsesEmitidas({
				idempresa: empresa!.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.numero ? { numero: filtrosColuna.numero } : {}),
				...(filtrosColuna.numeronfse
					? { numeronfse: filtrosColuna.numeronfse }
					: {}),
				...(filtrosColuna.razaosocial
					? { razaosocial: filtrosColuna.razaosocial }
					: {}),
				...(filtrosColuna.emissao
					? {
							dataInicio: filtrosColuna.emissao,
							dataFim: filtrosColuna.emissao,
						}
					: {}),
				...(filtrosColuna.status
					? { status: Number(filtrosColuna.status) }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			}),
		enabled: !!empresa?.id,
	});

	const { data: nfseConfiguracao } = useQuery({
		queryKey: ["nfse-configuracao", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return nfseConfiguracaoService.buscar(empresa.id);
		},
		enabled: !!empresa?.id,
	});

	const invalidateLista = () => {
		queryClient.invalidateQueries({ queryKey: ["nfse-emissao", empresa?.id] });
	};

	const cancelarMutation = useMutation({
		mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
			cancelarNfse(id, motivo),
		onSuccess: (resultado) => {
			if (resultado.pendente) {
				toast.info(
					resultado.protocolo
						? `Cancelamento recebido. Protocolo: ${resultado.protocolo}`
						: "Cancelamento aguardando validação do ambiente nacional",
				);
			} else {
				toast.success("NFS-e cancelada");
			}
			setNotaCancelar(null);
			setMotivoCancelamento("");
			invalidateLista();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const consultarMutation = useMutation({
		mutationFn: (id: string) => consultarNfsePorRps(id),
		onSuccess: (resultado) => {
			if (resultado.status === NFE_STATUS.CANCELADA) {
				toast.success(
					"Cancelamento/substituição confirmado no ambiente nacional",
				);
			} else if (resultado.numeroNfse) {
				toast.success(`NFS-e ${resultado.numeroNfse} autorizada`);
			} else if (resultado.pendente) {
				toast.info(
					resultado.protocolo
						? `Aguardando processamento. Protocolo: ${resultado.protocolo}`
						: "Ainda em processamento no ambiente nacional",
				);
			} else {
				toast.success("Consulta realizada");
			}
			invalidateLista();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const retransmitirMutation = useMutation({
		mutationFn: (id: string) => retransmitirNfse(id),
		onSuccess: (resultado) => {
			if (resultado.numeroNfse) {
				toast.success(`NFS-e ${resultado.numeroNfse} autorizada`);
			} else if (resultado.protocolo) {
				toast.warning(
					`DPS recebida. Protocolo: ${resultado.protocolo}. Consulte o status.`,
				);
			} else {
				toast.warning("Retransmissão concluída — consulte o status");
			}
			invalidateLista();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const acoesOcupadas =
		consultarMutation.isPending ||
		retransmitirMutation.isPending ||
		cancelarMutation.isPending;

	const columns = useMemo(
		() =>
			criarColunasNotaFiscalServico({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				onConsultar: (nota) => consultarMutation.mutate(nota.id),
				onRetransmitir: (nota) => retransmitirMutation.mutate(nota.id),
				onCancelar: (nota) => {
					setMotivoCancelamento("");
					setNotaCancelar(nota);
				},
				acoesOcupadas,
			}),
		[
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
			acoesOcupadas,
			consultarMutation,
			retransmitirMutation,
		],
	);

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		state: { pagination, columnVisibility },
		onPaginationChange: setPagination,
		onColumnVisibilityChange,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao?.totalPages ?? 0,
	});

	const colunasVisiveis = table.getVisibleLeafColumns();
	const mostrarSkeleton = isLoading || isLoadingPreferencias;
	const comFiltros = filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;
	const motivoValido = motivoCancelamento.trim().length >= 15;

	if (!empresa) {
		return (
			<PageContainer>
				<p className="text-muted-foreground px-4">
					Selecione uma empresa para visualizar as NFS-e
				</p>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-3 px-4">
					<div>
						<h1 className="text-2xl font-bold">Nota fiscal de serviço</h1>
						<p className="text-muted-foreground text-sm">
							Emissão manual de NFS-e (RPS)
						</p>
					</div>
					<div className="flex items-center gap-2">
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
						<AvisoAmbienteNfse ambiente={nfseConfiguracao?.ambiente} />
						<Button asChild>
							<Link href="/nota-fiscal-servico/nova">
								<Plus className="h-4 w-4 mr-2" aria-hidden="true" />
								Nova NFS-e
							</Link>
						</Button>
					</div>
				</div>

				<div className="mx-4 rounded-lg border bg-card">
					{mostrarSkeleton ? (
						<TableSkeleton
							rows={8}
							columns={colunasVisiveis.length || 7}
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
											{headerGroup.headers.map((header) => (
												<TableHead
													key={header.id}
													className={
														header.id === "acoes" ? "w-12 text-end" : undefined
													}
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
									{table.getRowModel().rows.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={colunasVisiveis.length}
												className="h-24 text-center text-muted-foreground"
											>
												{comFiltros
													? "Nenhuma NFS-e encontrada para os filtros selecionados."
													: "Nenhuma NFS-e emitida"}
											</TableCell>
										</TableRow>
									) : (
										table.getRowModel().rows.map((row) => (
											<TableRow key={row.id}>
												{row.getVisibleCells().map((cell) => (
													<TableCell
														key={cell.id}
														className={
															cell.column.id === "acoes"
																? "text-end"
																: undefined
														}
													>
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
				onOpenChange={(open) => {
					if (!open) {
						setNotaCancelar(null);
						setMotivoCancelamento("");
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancelar NFS-e</AlertDialogTitle>
						<AlertDialogDescription>
							Informe o motivo do cancelamento (mínimo 15 caracteres)
							{notaCancelar?.numeronfse
								? ` da NFS-e ${notaCancelar.numeronfse}`
								: ""}
							.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-2">
						<Textarea
							value={motivoCancelamento}
							onChange={(e) => setMotivoCancelamento(e.target.value)}
							placeholder="Descreva o motivo do cancelamento..."
							rows={4}
							maxLength={255}
						/>
						<p className="text-muted-foreground text-xs">
							{motivoCancelamento.trim().length}/15 caracteres mínimos
						</p>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelarMutation.isPending}>
							Voltar
						</AlertDialogCancel>
						<Button
							variant="destructive"
							disabled={!motivoValido || cancelarMutation.isPending}
							onClick={() => {
								if (!notaCancelar || !motivoValido) return;
								cancelarMutation.mutate({
									id: notaCancelar.id,
									motivo: motivoCancelamento.trim(),
								});
							}}
						>
							{cancelarMutation.isPending
								? "Cancelando..."
								: "Confirmar cancelamento"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageContainer>
	);
}

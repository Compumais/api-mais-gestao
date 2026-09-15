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
import { useNfeConfiguracao } from "@/hooks/use-nfe-configuracao";
import {
	TABELA_NOTA_FISCAL_PRODUTO,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	cancelarNfe,
	inutilizarNfe,
	listarNfesEmitidas,
	listarRascunhosEmissaoNfe,
	type NotaFiscalEmitida,
} from "@/services/nfe-emissao.service";
import { PageContainer } from "../components/page-container";
import { BotaoAlterarNumeracao } from "../configuracoes/components/dialog-alterar-numeracao";
import { AvisoAmbienteNfe } from "./components/aviso-ambiente-nfe";
import { ModalEventoNfe } from "./components/modal-evento-nfe";
import {
	COLUNA_PARA_CAMPO_FILTRO_NF_PRODUTO,
	type ConfigFiltroColunaNotaFiscalProduto,
	criarColunasNotaFiscalProduto,
	type FiltrosColunaNotaFiscalProdutoState,
	filtrosColunaNotaFiscalProdutoVazios,
	NFE_STATUS_OPCOES_FILTRO,
	visibilidadePadraoColunasNotaFiscalProduto,
} from "./nota-fiscal-venda-colunas";

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	const num = parseFloat(value);
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

function filtrosColunaAtivos(filtros: FiltrosColunaNotaFiscalProdutoState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function NotaFiscalVendaPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { nfeConfiguracao } = useNfeConfiguracao(empresa?.id);
	const queryClient = useQueryClient();
	const idPorPagina = useId();
	const [eventoModal, setEventoModal] = useState<{
		tipo: "cancelar" | "inutilizar";
		nota: NotaFiscalEmitida;
	} | null>(null);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaNotaFiscalProdutoState>(
			filtrosColunaNotaFiscalProdutoVazios,
		);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasNotaFiscalProduto(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_NOTA_FISCAL_PRODUTO, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_NF_PRODUTO[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaNotaFiscalProduto
	> => {
		return {
			numeronotafiscal: { tipo: "texto", placeholder: "Número" },
			razaosocial: { tipo: "texto", placeholder: "Destinatário" },
			dataEmissao: { tipo: "data" },
			valortotalnota: { tipo: "nenhum" },
			tipoambientenfe: { tipo: "nenhum" },
			status: { tipo: "opcoes", opcoes: NFE_STATUS_OPCOES_FILTRO },
			chavenfe: { tipo: "texto", placeholder: "Chave" },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"nfe-emitidas",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return listarNfesEmitidas({
				idempresa: empresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.numero ? { numero: filtrosColuna.numero } : {}),
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
				...(filtrosColuna.chavenfe
					? { chavenfe: filtrosColuna.chavenfe }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!empresa,
	});

	const { data: rascunhos } = useQuery({
		queryKey: ["rascunhos-emissao-nfe", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return listarRascunhosEmissaoNfe({
				idempresa: empresa.id,
				limit: 5,
			});
		},
		enabled: !!empresa,
	});

	const { mutate: executarEvento, isPending: processandoEvento } = useMutation({
		mutationFn: async ({
			tipo,
			nota,
			justificativa,
		}: {
			tipo: "cancelar" | "inutilizar";
			nota: NotaFiscalEmitida;
			justificativa: string;
		}) => {
			if (tipo === "cancelar") {
				return cancelarNfe(nota.id, justificativa);
			}
			return inutilizarNfe(nota.id, justificativa);
		},
		onSuccess: (resultado, variaveis) => {
			void queryClient.invalidateQueries({ queryKey: ["nfe-emitidas"] });
			setEventoModal(null);
			toast.success(
				variaveis.tipo === "cancelar"
					? "NF-e cancelada com sucesso"
					: "Numeração inutilizada com sucesso",
				{ description: resultado.xMotivo ?? undefined },
			);
		},
		onError: (erro, variaveis) => {
			toast.error(
				variaveis.tipo === "cancelar"
					? "Não foi possível cancelar a NF-e"
					: "Não foi possível inutilizar a numeração",
				{
					description:
						erro instanceof Error ? erro.message : "Erro desconhecido",
				},
			);
		},
	});

	const columns = useMemo(
		() =>
			criarColunasNotaFiscalProduto({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				onCancelar: (nota) => setEventoModal({ tipo: "cancelar", nota }),
				onInutilizar: (nota) => setEventoModal({ tipo: "inutilizar", nota }),
			}),
		[
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
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

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Notas Fiscais de Venda (NF-e)</h1>
					{empresa && (
						<div className="flex flex-wrap items-center gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<IconLayoutColumns className="size-4" />
										<span className="hidden lg:inline">
											Personalizar Colunas
										</span>
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
							<BotaoAlterarNumeracao idempresa={empresa.id} abaInicial="nfe" />
							<Link href="/nota-fiscal-venda/nova">
								<Button className="gap-2">
									<Plus className="h-4 w-4" />
									Emitir NF-e
								</Button>
							</Link>
						</div>
					)}
				</div>

				{nfeConfiguracao && (
					<div className="px-4">
						<AvisoAmbienteNfe ambiente={nfeConfiguracao.ambiente} />
					</div>
				)}

				{rascunhos && rascunhos.data.length > 0 ? (
					<section className="mx-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
						<h2 className="font-semibold mb-2">Rascunhos pendentes</h2>
						<ul className="flex flex-col gap-2">
							{rascunhos.data.map((rascunho) => (
								<li key={rascunho.id}>
									<Link
										href={`/nota-fiscal-venda/nova?rascunho=${rascunho.id}`}
										className="text-sm underline-offset-4 hover:underline"
									>
										{rascunho.razaosocial ?? "Destinatário não informado"} (
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
								Selecione uma empresa para visualizar as notas fiscais
							</p>
						</div>
					) : mostrarSkeleton ? (
						<TableSkeleton
							rows={10}
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
											<TableRow
												key={row.id}
												className="cursor-pointer hover:bg-muted/50"
											>
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
												className="h-24 text-center text-muted-foreground"
											>
												{comFiltros ? (
													"Nenhuma NF-e encontrada para os filtros selecionados."
												) : (
													<>
														Nenhuma NF-e emitida.{" "}
														<Link
															href="/nota-fiscal-venda/nova"
															className="text-primary underline"
														>
															Emitir agora
														</Link>
													</>
												)}
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
							{data && (data.paginacao?.total ?? 0) > 0 && (
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
										{data.paginacao?.totalPages} ({data.paginacao?.total}{" "}
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

			<ModalEventoNfe
				open={eventoModal !== null}
				onClose={() => setEventoModal(null)}
				onConfirmar={(justificativa) => {
					if (!eventoModal) return;
					executarEvento({
						tipo: eventoModal.tipo,
						nota: eventoModal.nota,
						justificativa,
					});
				}}
				carregando={processandoEvento}
				titulo={
					eventoModal?.tipo === "cancelar"
						? `Cancelar NF-e ${eventoModal.nota.serie}-${eventoModal.nota.numeronotafiscal}`
						: `Inutilizar ${eventoModal?.nota.serie}-${eventoModal?.nota.numeronotafiscal}`
				}
				descricao={
					eventoModal?.tipo === "cancelar"
						? "Cancelamento permitido em até 24 horas após a autorização. Justificativa mínima de 15 caracteres."
						: "Inutilização para NF-e não autorizada (pendente ou rejeitada). Justificativa mínima de 15 caracteres."
				}
				rotuloConfirmar={
					eventoModal?.tipo === "cancelar"
						? "Confirmar cancelamento"
						: "Confirmar inutilização"
				}
			/>
		</PageContainer>
	);
}

"use client";

import { IconChevronDown, IconLayoutColumns, IconSend } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { CupomNaoFiscal } from "@/components/pdv/cupom-nao-fiscal";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { useNfceAmbientePdv } from "@/hooks/use-nfce-ambiente-pdv";
import {
	TABELA_NFCE,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type CupomNaoFiscalData,
	type MeioPagamentoPdv,
	type PagamentoParcialPdv,
} from "@/lib/gourmet-utils";
import {
	type DadosCupomNfceApi,
	type NfceListagem,
	nfceService,
} from "@/services/nfce.service";
import { PageContainer } from "../components/page-container";
import { BotaoAlterarNumeracao } from "../configuracoes/components/dialog-alterar-numeracao";
import { AvisoAmbienteNfe } from "../nota-fiscal-venda/components/aviso-ambiente-nfe";
import { ModalEventoNfe } from "../nota-fiscal-venda/components/modal-evento-nfe";
import {
	COLUNA_PARA_CAMPO_FILTRO_NFCE,
	type ConfigFiltroColunaNfce,
	criarColunasNfce,
	type FiltrosColunaNfceState,
	filtrosColunaNfceVazios,
	NFCE_STATUS_OPCOES_FILTRO,
	visibilidadePadraoColunasNfce,
} from "./nfce-colunas";

function mapearCupomApi(dados: DadosCupomNfceApi): CupomNaoFiscalData {
	return {
		vendaId: dados.vendaId,
		empresaNome: dados.empresaNome,
		dataHora: new Date(dados.dataHora),
		itens: dados.itens,
		subtotal: dados.subtotal,
		desconto: dados.desconto,
		taxaServico: dados.taxaServico,
		couvert: dados.couvert,
		total: dados.total,
		pagamentos: dados.pagamentos.map(
			(pagamento): PagamentoParcialPdv => ({
				tipo: "meio",
				meio: pagamento.meio as MeioPagamentoPdv,
				label: pagamento.label,
				valor: pagamento.valor,
			}),
		),
		troco: dados.troco,
		nfce: dados.nfce,
	};
}

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

function filtrosColunaAtivos(filtros: FiltrosColunaNfceState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function NfcePage() {
	const { empresa } = useEmpresa();
	const { ambiente: ambienteNfce } = useNfceAmbientePdv();
	const idempresa = empresa?.id ?? "";
	const queryClient = useQueryClient();
	const idPorPagina = useId();
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	});
	const [filtrosColuna, setFiltrosColuna] = useState<FiltrosColunaNfceState>(
		filtrosColunaNfceVazios,
	);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
	const [reemitindoId, setReemitindoId] = useState<string | null>(null);
	const [cupomDados, setCupomDados] = useState<CupomNaoFiscalData | null>(null);
	const [carregandoCupomId, setCarregandoCupomId] = useState<string | null>(
		null,
	);
	const [eventoModal, setEventoModal] = useState<{
		tipo: "cancelar" | "inutilizar";
		nota: NfceListagem;
	} | null>(null);

	const visibilidadePadrao = useMemo(() => visibilidadePadraoColunasNfce(), []);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_NFCE, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_NFCE[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaNfce
	> => {
		return {
			dataEmissao: { tipo: "data" },
			numeronotafiscal: { tipo: "texto", placeholder: "Número" },
			idvenda: { tipo: "texto", placeholder: "Venda PDV" },
			valortotalnota: { tipo: "nenhum" },
			status: { tipo: "opcoes", opcoes: NFCE_STATUS_OPCOES_FILTRO },
			tipoambientenfe: { tipo: "nenhum" },
			chavenfe: { tipo: "texto", placeholder: "Chave" },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"nfce",
			idempresa,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: () =>
			nfceService.listar({
				idempresa,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.numero ? { numero: filtrosColuna.numero } : {}),
				...(filtrosColuna.idvenda ? { idvenda: filtrosColuna.idvenda } : {}),
				...(filtrosColuna.chavenfe
					? { chavenfe: filtrosColuna.chavenfe }
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
		enabled: !!idempresa,
	});

	const reemitirMutation = useMutation({
		mutationFn: (idnotafiscal: string) =>
			nfceService.reemitir({ idempresa, idnotafiscal }),
		onSuccess: (resultado) => {
			if (resultado.emitida) {
				toast.success("NFC-e autorizada com sucesso!");
			} else {
				const motivo =
					resultado.xMotivo ??
					resultado.erro ??
					resultado.pendencias?.map((p) => p.mensagem).join("; ") ??
					"Falha na reemissão";
				toast.error(`NFC-e não autorizada: ${motivo}`);
			}
			queryClient.invalidateQueries({ queryKey: ["nfce", idempresa] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao reemitir NFC-e");
		},
		onSettled: () => {
			setReemitindoId(null);
		},
	});

	const transmitirPendentesMutation = useMutation({
		mutationFn: () => nfceService.transmitirPendentes({ idempresa }),
		onSuccess: (resultado) => {
			if (resultado.total === 0) {
				toast.info("Nenhuma NFC-e pendente para transmitir.");
			} else if (resultado.falhas === 0) {
				toast.success(
					`${resultado.autorizadas} NFC-e pendente(s) autorizada(s) com sucesso.`,
				);
			} else if (resultado.autorizadas === 0) {
				toast.error(
					`Nenhuma NFC-e autorizada. ${resultado.falhas} falha(s) no lote.`,
				);
			} else {
				toast.warning(
					`Lote concluído: ${resultado.autorizadas} autorizada(s), ${resultado.falhas} falha(s).`,
				);
			}
			queryClient.invalidateQueries({ queryKey: ["nfce", idempresa] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao transmitir NFC-e pendentes");
		},
	});

	const eventoMutation = useMutation({
		mutationFn: async ({
			tipo,
			nota,
			justificativa,
		}: {
			tipo: "cancelar" | "inutilizar";
			nota: NfceListagem;
			justificativa: string;
		}) => {
			if (tipo === "cancelar") {
				return nfceService.cancelar({
					idnotafiscal: nota.idnotafiscal,
					justificativa,
				});
			}
			return nfceService.inutilizar({
				idempresa,
				idnotafiscal: nota.idnotafiscal,
				justificativa,
			});
		},
		onSuccess: (_, variables) => {
			toast.success(
				variables.tipo === "cancelar"
					? "NFC-e cancelada com sucesso"
					: "Numeração inutilizada com sucesso",
			);
			setEventoModal(null);
			queryClient.invalidateQueries({ queryKey: ["nfce", idempresa] });
		},
		onError: (error: Error, variables) => {
			toast.error(
				variables.tipo === "cancelar"
					? error.message || "Não foi possível cancelar a NFC-e"
					: error.message || "Não foi possível inutilizar a numeração",
			);
		},
	});

	const handleImprimirCupom = useCallback(async (idnotafiscal: string) => {
		setCarregandoCupomId(idnotafiscal);
		try {
			const dados = await nfceService.buscarCupom(idnotafiscal);
			setCupomDados(mapearCupomApi(dados));
		} catch (erro) {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao carregar cupom NFC-e",
			);
		} finally {
			setCarregandoCupomId(null);
		}
	}, []);

	const columns = useMemo(
		() =>
			criarColunasNfce({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				reemitindoId,
				carregandoCupomId,
				onRetransmitir: (idnotafiscal) => {
					setReemitindoId(idnotafiscal);
					reemitirMutation.mutate(idnotafiscal);
				},
				onImprimir: (idnotafiscal) => {
					void handleImprimirCupom(idnotafiscal);
				},
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
			reemitindoId,
			carregandoCupomId,
			reemitirMutation,
			handleImprimirCupom,
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
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const colunasVisiveis = table.getVisibleLeafColumns();
	const mostrarSkeleton = isLoading || isLoadingPreferencias;
	const comFiltros = filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	if (!idempresa) {
		return (
			<PageContainer>
				<div className="px-4 py-4">
					<p className="text-muted-foreground">
						Selecione uma empresa no menu superior.
					</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold">NFC-e</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Cupons fiscais emitidos pelo PDV — pendentes, autorizados e
							rejeitados
						</p>
					</div>
					<div className="flex w-full flex-wrap gap-2 sm:w-auto sm:items-center">
						<Button
							type="button"
							variant="default"
							size="sm"
							disabled={
								transmitirPendentesMutation.isPending ||
								reemitirMutation.isPending ||
								mostrarSkeleton
							}
							onClick={() => transmitirPendentesMutation.mutate()}
						>
							<IconSend className="size-4" />
							{transmitirPendentesMutation.isPending
								? "Transmitindo…"
								: "Transmitir todas pendentes"}
						</Button>
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
						<BotaoAlterarNumeracao idempresa={idempresa} abaInicial="nfce" />
					</div>
				</div>

				<div className="px-4">
					<AvisoAmbienteNfe ambiente={ambienteNfce} />
				</div>

				<div className="mx-4 rounded-lg border bg-card">
					{mostrarSkeleton ? (
						<TableSkeleton
							columns={colunasVisiveis.length || 7}
							rows={8}
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
									{table.getRowModel().rows.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={colunasVisiveis.length}
												className="h-24 text-center text-muted-foreground"
											>
												{comFiltros
													? "Nenhuma NFC-e encontrada para os filtros selecionados."
													: "Nenhuma NFC-e encontrada."}
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

			<ModalEventoNfe
				open={eventoModal != null}
				onClose={() => setEventoModal(null)}
				carregando={eventoMutation.isPending}
				titulo={
					eventoModal?.tipo === "cancelar"
						? "Cancelar NFC-e"
						: "Inutilizar numeração"
				}
				descricao={
					eventoModal?.tipo === "cancelar"
						? "Informe a justificativa do cancelamento (mínimo 15 caracteres)."
						: `Inutilizar numeração da NFC-e (modelo 65) série ${eventoModal?.nota.serie ?? "—"} número ${eventoModal?.nota.numeronotafiscal ?? "—"}. Justificativa mínima de 15 caracteres.`
				}
				rotuloConfirmar={
					eventoModal?.tipo === "cancelar" ? "Cancelar NFC-e" : "Inutilizar"
				}
				onConfirmar={(justificativa) => {
					if (!eventoModal) return;
					eventoMutation.mutate({
						tipo: eventoModal.tipo,
						nota: eventoModal.nota,
						justificativa,
					});
				}}
			/>

			<Dialog
				open={cupomDados != null}
				onOpenChange={(aberto) => {
					if (!aberto) setCupomDados(null);
				}}
			>
				<DialogContent className="flex max-h-[95vh] flex-col sm:max-w-lg">
					{cupomDados && (
						<CupomNaoFiscal
							dados={cupomDados}
							onFechar={() => setCupomDados(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}

"use client";

import { IconCashRegister, IconReceipt } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	type RowSelectionState,
	useReactTable,
} from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	useInterpretarRejeicaoNfce,
	useNfceDetalhes,
} from "@/hooks/use-nfce-detalhes";
import {
	nfceService,
	type ResultadoEmitirNfceVendasNaoFiscaisLote,
} from "@/services/nfce.service";
import { produtosService } from "@/services/produtos.service";
import { usuariosService } from "@/services/usuarios.service";
import type { VendaPdvGourmet } from "@/services/venda-pdv-gourmet.service";
import { vendaPdvGourmetService } from "@/services/venda-pdv-gourmet.service";
import { PageContainer } from "../components/page-container";
import { DialogFecharCaixaPdv } from "../fechamentos-caixa/dialog-fechar-caixa-pdv";
import { DialogDetalhesNfce } from "../nfce/components/dialog-detalhes-nfce";
import { DialogCancelarVendaNaoFiscal } from "./dialog-cancelar-venda-nao-fiscal";
import { DialogConfirmarEmitirNfceLote } from "./dialog-confirmar-emitir-nfce-lote";
import { DialogResultadoEmitirNfceLote } from "./dialog-resultado-emitir-nfce-lote";
import { ItensVendaDialog } from "./itens-venda-dialog";
import {
	COLUNA_PARA_CAMPO_FILTRO_VENDAS_PDV,
	type ConfigFiltroColunaVendasPdv,
	criarColunasVendasPdv,
	FISCAL_OPCOES_FILTRO,
	NFCE_STATUS_OPCOES_FILTRO,
	ORIGEM_OPCOES_FILTRO,
	PAGAMENTO_OPCOES_FILTRO,
} from "./vendas-pdv-colunas";
import {
	type FiltrosColunaVendasPdvState,
	filtrarVendasPdvColuna,
	filtrosColunaVendasPdvAtivos,
	filtrosColunaVendasPdvVazios,
	idNfceVenda,
	ordenarVendasPdvColuna,
	podeEmitirNfceVendaNaoFiscal,
} from "./vendas-pdv-helpers";

function mensagemErroApi(error: unknown, fallback: string): string {
	if (
		error &&
		typeof error === "object" &&
		"response" in error &&
		error.response &&
		typeof error.response === "object" &&
		"data" in error.response &&
		error.response.data &&
		typeof error.response.data === "object" &&
		"error" in error.response.data &&
		typeof error.response.data.error === "string"
	) {
		return error.response.data.error;
	}
	if (error instanceof Error && error.message) return error.message;
	return fallback;
}

export default function VendasPdvPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();

	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaVendasPdvState>(filtrosColunaVendasPdvVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 15,
	});
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const [vendaSelecionada, setVendaSelecionada] =
		useState<VendaPdvGourmet | null>(null);
	const [dialogItensAberto, setDialogItensAberto] = useState(false);
	const [detalhesNotaId, setDetalhesNotaId] = useState<string | null>(null);
	const [vendaCancelar, setVendaCancelar] = useState<VendaPdvGourmet | null>(
		null,
	);
	const [confirmarLoteAberto, setConfirmarLoteAberto] = useState(false);
	const [resultadoLote, setResultadoLote] =
		useState<ResultadoEmitirNfceVendasNaoFiscaisLote | null>(null);
	const [resultadoLoteAberto, setResultadoLoteAberto] = useState(false);
	const [fecharCaixaAberto, setFecharCaixaAberto] = useState(false);

	const { data: produtosData } = useQuery({
		queryKey: ["produtos-lista", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return produtosService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa,
		staleTime: 60_000,
	});

	const { data: usuariosLista } = useQuery({
		queryKey: ["usuarios-lista", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return usuariosService.listarTodos({ idempresa: empresa.id });
		},
		enabled: !!empresa,
		staleTime: 60_000,
	});

	const produtosPorId = useMemo(() => {
		const map: Record<string, string> = {};
		for (const p of produtosData ?? []) {
			map[p.id] = p.nome;
		}
		return map;
	}, [produtosData]);

	const usuariosPorId = useMemo(() => {
		const map: Record<string, string> = {};
		for (const u of usuariosLista ?? []) {
			map[u.id] = u.nome;
		}
		return map;
	}, [usuariosLista]);

	const numeropdvApi = useMemo(() => {
		const n = Number(filtrosColuna.numeropdv.trim());
		return Number.isFinite(n) && filtrosColuna.numeropdv.trim() !== ""
			? n
			: undefined;
	}, [filtrosColuna.numeropdv]);

	const { data, isLoading } = useQuery({
		queryKey: [
			"vendas-pdv-gourmet",
			empresa?.id,
			filtrosColuna.datacriacao,
			numeropdvApi,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const dia = filtrosColuna.datacriacao.trim() || undefined;
			return vendaPdvGourmetService.listar({
				idempresa: empresa.id,
				dataInicio: dia,
				dataFim: dia,
				numeropdv: numeropdvApi,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			});
		},
		enabled: !!empresa,
	});

	const vendasExibidas = useMemo(() => {
		const base = data?.data ?? [];
		const filtradas = filtrarVendasPdvColuna(
			base,
			filtrosColuna,
			usuariosPorId,
		);
		return ordenarVendasPdvColuna(
			filtradas,
			ordenarPor,
			ordem,
			usuariosPorId,
		);
	}, [data?.data, filtrosColuna, ordenarPor, ordem, usuariosPorId]);

	const cancelarMutation = useMutation({
		mutationFn: async ({
			venda,
			motivo,
		}: {
			venda: VendaPdvGourmet;
			motivo: string | null;
		}) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return vendaPdvGourmetService.cancelarNaoFiscal(venda.id, {
				idempresa: empresa.id,
				motivo,
			});
		},
		onSuccess: (resultado) => {
			const partes = [
				"Venda cancelada",
				resultado.titulosCancelados > 0
					? `${resultado.titulosCancelados} título(s)`
					: null,
				resultado.movimentosEstornados > 0
					? `${resultado.movimentosEstornados} movimento(s) de estoque`
					: null,
			].filter(Boolean);
			toast.success(partes.join(" · "));
			if (resultado.avisos.length > 0) {
				toast.warning(resultado.avisos.join(" "));
			}
			setVendaCancelar(null);
			void queryClient.invalidateQueries({ queryKey: ["vendas-pdv-gourmet"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Não foi possível cancelar a venda");
		},
	});

	const emitirUnitariaMutation = useMutation({
		mutationFn: async (venda: VendaPdvGourmet) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return nfceService.emitirDeVendaNaoFiscal({
				idempresa: empresa.id,
				idvenda: venda.id,
			});
		},
		onSuccess: (resultado) => {
			void queryClient.invalidateQueries({ queryKey: ["vendas-pdv-gourmet"] });
			void queryClient.invalidateQueries({ queryKey: ["nfce"] });
			if (resultado.emitida) {
				toast.success(
					resultado.jaEmitida
						? "NFC-e já estava autorizada"
						: "NFC-e autorizada com sucesso",
				);
				if (resultado.avisosEstoque?.length) {
					toast.warning(resultado.avisosEstoque.join(" "));
				}
				if (resultado.idnotafiscal) {
					setDetalhesNotaId(resultado.idnotafiscal);
				}
				return;
			}
			const mensagem =
				resultado.xMotivo ??
				resultado.erro ??
				resultado.pendencias?.map((p) => p.mensagem).join("; ") ??
				"NFC-e não autorizada";
			toast.error(mensagem);
			if (resultado.idnotafiscal) {
				setDetalhesNotaId(resultado.idnotafiscal);
			}
		},
		onError: (error: unknown) => {
			toast.error(mensagemErroApi(error, "Não foi possível emitir a NFC-e"));
		},
	});

	const emitirLoteMutation = useMutation({
		mutationFn: async (idsVendas: string[]) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return nfceService.emitirLoteVendasNaoFiscais({
				idempresa: empresa.id,
				idsVendas,
			});
		},
		onSuccess: (resultado) => {
			setConfirmarLoteAberto(false);
			setRowSelection({});
			setResultadoLote(resultado);
			setResultadoLoteAberto(true);
			void queryClient.invalidateQueries({ queryKey: ["vendas-pdv-gourmet"] });
			void queryClient.invalidateQueries({ queryKey: ["nfce"] });
			toast.success(
				`Lote: ${resultado.autorizadas} autorizada(s), ${resultado.falhas} falha(s), ${resultado.ignoradas} ignorada(s)`,
			);
		},
		onError: (error: unknown) => {
			toast.error(
				mensagemErroApi(error, "Não foi possível emitir o lote de NFC-e"),
			);
		},
	});

	const onOrdenarColuna = useCallback(
		(colunaId: string, direcao: OrdenacaoColunaTabela) => {
			if (!direcao) {
				setOrdenarPor(null);
				setOrdem(null);
			} else {
				setOrdenarPor(colunaId);
				setOrdem(direcao);
			}
		},
		[],
	);

	const onFiltrarColuna = useCallback((colunaId: string, valor: string) => {
		const campo = COLUNA_PARA_CAMPO_FILTRO_VENDAS_PDV[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaVendasPdv
	> => {
		return {
			numeropdv: { tipo: "texto", placeholder: "Nº PDV" },
			datacriacao: { tipo: "data" },
			origem: { tipo: "opcoes", opcoes: ORIGEM_OPCOES_FILTRO },
			operador: { tipo: "texto", placeholder: "Operador" },
			pagamento: { tipo: "opcoes", opcoes: PAGAMENTO_OPCOES_FILTRO },
			fiscal: { tipo: "opcoes", opcoes: FISCAL_OPCOES_FILTRO },
			nfce: { tipo: "opcoes", opcoes: NFCE_STATUS_OPCOES_FILTRO },
			valortotal: { tipo: "texto", placeholder: "Valor" },
		};
	}, []);

	const handleVerItens = useCallback((venda: VendaPdvGourmet) => {
		setVendaSelecionada(venda);
		setDialogItensAberto(true);
	}, []);

	const handleVerNfce = useCallback((venda: VendaPdvGourmet) => {
		const id = idNfceVenda(venda);
		if (id) setDetalhesNotaId(id);
	}, []);

	const handleCancelarVendaNaoFiscal = useCallback((venda: VendaPdvGourmet) => {
		setVendaCancelar(venda);
	}, []);

	const handleEmitirNfce = useCallback(
		(venda: VendaPdvGourmet) => {
			emitirUnitariaMutation.mutate(venda);
		},
		[emitirUnitariaMutation],
	);

	const detalhesQuery = useNfceDetalhes({
		idempresa: empresa?.id ?? "",
		idnotafiscal: detalhesNotaId,
		enabled: detalhesNotaId != null && !!empresa,
	});
	const interpretacaoQuery = useInterpretarRejeicaoNfce({
		idempresa: empresa?.id ?? "",
		idnotafiscal: detalhesNotaId,
		enabled:
			detalhesNotaId != null &&
			!!empresa &&
			detalhesQuery.data?.rejeicao != null &&
			Boolean(detalhesQuery.data.iaDisponivel),
	});

	const columns = useMemo(
		() =>
			criarColunasVendasPdv({
				usuariosPorId,
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				onVerItens: handleVerItens,
				onVerNfce: handleVerNfce,
				onCancelarVendaNaoFiscal: handleCancelarVendaNaoFiscal,
				onEmitirNfce: handleEmitirNfce,
				emitindoId: emitirUnitariaMutation.isPending
					? (emitirUnitariaMutation.variables?.id ?? null)
					: null,
			}),
		[
			usuariosPorId,
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
			handleVerItens,
			handleVerNfce,
			handleCancelarVendaNaoFiscal,
			handleEmitirNfce,
			emitirUnitariaMutation.isPending,
			emitirUnitariaMutation.variables?.id,
		],
	);

	const table = useReactTable({
		data: vendasExibidas,
		columns,
		state: { pagination, rowSelection },
		onPaginationChange: setPagination,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
		enableRowSelection: (row) => podeEmitirNfceVendaNaoFiscal(row.original),
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const idsSelecionados = useMemo(
		() => Object.keys(rowSelection).filter((id) => rowSelection[id]),
		[rowSelection],
	);

	const comFiltros = filtrosColunaVendasPdvAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between gap-3 px-4">
					<div className="space-y-1">
						<h1 className="text-2xl font-bold">Histórico de vendas PDV</h1>
						<p className="text-sm text-muted-foreground">
							Filtros e ordenação nos cabeçalhos das colunas. Vendas sem NFC-e
							autorizada podem ser canceladas ou convertidas em NFC-e.
						</p>
					</div>
					<div className="flex items-center gap-2">
						{empresa ? (
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => setFecharCaixaAberto(true)}
							>
								<IconCashRegister className="size-4" aria-hidden="true" />
								Fechar caixa
							</Button>
						) : null}
						{idsSelecionados.length > 0 ? (
							<Button
								size="sm"
								className="gap-1.5"
								disabled={emitirLoteMutation.isPending}
								onClick={() => setConfirmarLoteAberto(true)}
							>
								<IconReceipt className="size-4" aria-hidden="true" />
								Emitir NFC-e em lote ({idsSelecionados.length})
							</Button>
						) : null}
						{comFiltros ? (
							<>
								<Badge variant="secondary">Filtros ativos</Badge>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setFiltrosColuna(filtrosColunaVendasPdvVazios);
										setOrdenarPor(null);
										setOrdem(null);
										setPagination((p) => ({ ...p, pageIndex: 0 }));
									}}
								>
									Limpar
								</Button>
							</>
						) : null}
					</div>
				</div>

				<div className="mx-4 overflow-x-auto rounded-lg border bg-card">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as vendas
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10} columns={10}>
							<TableHead />
							<TableHead>Nº PDV</TableHead>
							<TableHead>Data / Hora</TableHead>
							<TableHead>Origem</TableHead>
							<TableHead>Operador</TableHead>
							<TableHead>Pagamento</TableHead>
							<TableHead>Fiscal</TableHead>
							<TableHead>NFC-e</TableHead>
							<TableHead>Total</TableHead>
							<TableHead />
						</TableSkeleton>
					) : (
						<>
							<Table className="min-w-[1080px]">
								<TableHeader>
									{table.getHeaderGroups().map((hg) => (
										<TableRow key={hg.id}>
											{hg.headers.map((header) => (
												<TableHead
													key={header.id}
													className={header.id === "acoes" ? "text-right" : ""}
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
												className="h-24 text-center text-muted-foreground"
											>
												Nenhuma venda encontrada para os filtros selecionados.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>

							{(data?.paginacao.totalPages ?? 0) > 0 && (
								<div className="flex items-center justify-between border-t px-4 py-3">
									<p className="text-sm text-muted-foreground">
										{data?.paginacao.total ?? 0} venda
										{(data?.paginacao.total ?? 0) !== 1 ? "s" : ""} • Página{" "}
										{pagination.pageIndex + 1} de{" "}
										{data?.paginacao.totalPages ?? 1}
										{vendasExibidas.length !== (data?.data.length ?? 0)
											? ` · ${vendasExibidas.length} nesta página após filtro`
											: ""}
									</p>
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

			{empresa ? (
				<DialogFecharCaixaPdv
					open={fecharCaixaAberto}
					onOpenChange={setFecharCaixaAberto}
					idempresa={empresa.id}
				/>
			) : null}

			{empresa && (
				<ItensVendaDialog
					venda={vendaSelecionada}
					idempresa={empresa.id}
					open={dialogItensAberto}
					onOpenChange={setDialogItensAberto}
					produtosPorId={produtosPorId}
					usuariosPorId={usuariosPorId}
				/>
			)}

			<DialogCancelarVendaNaoFiscal
				open={vendaCancelar != null}
				onClose={() => {
					if (!cancelarMutation.isPending) setVendaCancelar(null);
				}}
				carregando={cancelarMutation.isPending}
				numeropdv={vendaCancelar?.numeropdv}
				onConfirmar={(motivo) => {
					if (!vendaCancelar) return;
					cancelarMutation.mutate({ venda: vendaCancelar, motivo });
				}}
			/>

			<DialogConfirmarEmitirNfceLote
				open={confirmarLoteAberto}
				onClose={() => {
					if (!emitirLoteMutation.isPending) setConfirmarLoteAberto(false);
				}}
				carregando={emitirLoteMutation.isPending}
				quantidade={idsSelecionados.length}
				onConfirmar={() => {
					if (idsSelecionados.length === 0) return;
					emitirLoteMutation.mutate(idsSelecionados);
				}}
			/>

			<DialogResultadoEmitirNfceLote
				open={resultadoLoteAberto}
				onClose={() => setResultadoLoteAberto(false)}
				resultado={resultadoLote}
				onConsultarNota={(idnotafiscal) => {
					setResultadoLoteAberto(false);
					setDetalhesNotaId(idnotafiscal);
				}}
			/>

			<DialogDetalhesNfce
				open={detalhesNotaId != null}
				onOpenChange={(aberto) => {
					if (!aberto) setDetalhesNotaId(null);
				}}
				carregando={detalhesQuery.isLoading}
				erro={detalhesQuery.error instanceof Error ? detalhesQuery.error : null}
				detalhes={detalhesQuery.data}
				interpretacao={interpretacaoQuery.data}
				carregandoInterpretacao={interpretacaoQuery.isFetching}
				erroInterpretacao={
					interpretacaoQuery.error instanceof Error
						? interpretacaoQuery.error
						: null
				}
			/>
		</PageContainer>
	);
}

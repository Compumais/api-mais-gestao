import {
	flexRender,
	getCoreRowModel,
	type VisibilityState,
	useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Columns3 } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import { rotaHomePdv, rotuloModelo, type StatusContext } from "@/lib/pdv-types";
import { money } from "@/lib/utils";
import type { OrdenacaoColunaTabela } from "@/ui/components/cabecalho-coluna-tabela";
import { DialogCancelarNfce } from "@/ui/components/dialog-cancelar-nfce";
import { DialogInutilizarNfce } from "@/ui/components/dialog-inutilizar-nfce";
import { FunctionBar } from "@/ui/components/function-bar";
import { PdvShell } from "@/ui/components/pdv-shell";
import { Topbar } from "@/ui/components/topbar";
import { Button } from "@/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Label } from "@/ui/components/ui/label";
import { Select } from "@/ui/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/ui/components/ui/table";
import { useTeclasFuncao } from "@/ui/hooks/use-teclas-funcao";
import {
	COLUNA_PARA_CAMPO_FILTRO_VENDAS,
	type ConfigFiltroColunaVendas,
	criarColunasVendas,
	filtrarVendas,
	type FiltrosColunaVendasState,
	filtrosColunaVendasVazios,
	NFCE_OPCOES_FILTRO,
	ordenarVendas,
	ORIGEM_OPCOES_FILTRO,
	PAGAMENTO_OPCOES_FILTRO,
	rotuloColunaVendas,
	SYNC_OPCOES_FILTRO,
	type VendaListagem,
	visibilidadePadraoColunasVendas,
	rotuloNumeracaoNfce,
} from "./vendas-colunas";

const CHAVE_COLUNAS_VENDAS = "pdv.vendas.colunas";

type ItemVendaDetalhe = {
	idproduto: string;
	descricao: string;
	quantidade: number;
	precounitario: number;
	precototal: number;
};

function carregarVisibilidadeColunas(): VisibilityState {
	const padrao = visibilidadePadraoColunasVendas();
	try {
		const raw = localStorage.getItem(CHAVE_COLUNAS_VENDAS);
		if (!raw) return padrao;
		const parsed = JSON.parse(raw) as VisibilityState;
		return { ...padrao, ...parsed };
	} catch {
		return padrao;
	}
}

function filtrosColunaAtivos(filtros: FiltrosColunaVendasState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export function VendasPage() {
	const navigate = useNavigate();
	const { status } = useOutletContext<StatusContext>();
	const { teclas } = useTeclasFuncao();
	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const [vendas, setVendas] = useState<VendaListagem[]>([]);
	const [loading, setLoading] = useState(false);
	const [retransmitindoId, setRetransmitindoId] = useState<string | null>(null);
	const [inutilizarVendaId, setInutilizarVendaId] = useState<string | null>(
		null,
	);
	const [cancelarVendaId, setCancelarVendaId] = useState<string | null>(null);
	const [msg, setMsg] = useState("");
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	});
	const [filtrosColuna, setFiltrosColuna] = useState<FiltrosColunaVendasState>(
		filtrosColunaVendasVazios,
	);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		() => carregarVisibilidadeColunas(),
	);
	const [idsExpandidos, setIdsExpandidos] = useState<Set<string>>(
		() => new Set(),
	);
	const [itensPorVenda, setItensPorVenda] = useState<
		Record<string, ItemVendaDetalhe[]>
	>({});
	const [carregandoItensId, setCarregandoItensId] = useState<string | null>(
		null,
	);
	const idsExpandidosRef = useRef(idsExpandidos);
	const itensPorVendaRef = useRef(itensPorVenda);
	idsExpandidosRef.current = idsExpandidos;
	itensPorVendaRef.current = itensPorVenda;

	useEffect(() => {
		localStorage.setItem(CHAVE_COLUNAS_VENDAS, JSON.stringify(columnVisibility));
	}, [columnVisibility]);

	async function load() {
		setLoading(true);
		try {
			setVendas(await pdvInvoke<VendaListagem[]>("listarVendas"));
		} finally {
			setLoading(false);
		}
	}

	const onToggleExpandir = useCallback(async (id: string) => {
		if (idsExpandidosRef.current.has(id)) {
			setIdsExpandidos((atual) => {
				const proximo = new Set(atual);
				proximo.delete(id);
				return proximo;
			});
			return;
		}

		setIdsExpandidos((atual) => new Set(atual).add(id));

		if (itensPorVendaRef.current[id] !== undefined) return;

		setCarregandoItensId(id);
		try {
			const detalhe = await pdvInvoke<{
				itens?: ItemVendaDetalhe[];
			} | null>("obterVenda", id);
			setItensPorVenda((atual) => ({
				...atual,
				[id]: detalhe?.itens ?? [],
			}));
		} catch (err) {
			setMsg(
				err instanceof Error
					? err.message
					: "Falha ao carregar produtos da venda",
			);
			setIdsExpandidos((atual) => {
				const proximo = new Set(atual);
				proximo.delete(id);
				return proximo;
			});
		} finally {
			setCarregandoItensId(null);
		}
	}, []);

	async function retransmitir(id: string) {
		setRetransmitindoId(id);
		setMsg("");
		try {
			const result = await pdvInvoke<{ modo: string; mensagem: string }>(
				"retransmitirNfce",
				id,
			);
			setMsg(result.mensagem);
			await load();
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Falha ao retransmitir");
		} finally {
			setRetransmitindoId(null);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: deve rodar apenas uma vez ao montar
	useEffect(() => {
		void load();
	}, []);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_VENDAS[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaVendas
	> => {
		return {
			criadoem: { tipo: "data" },
			numero_mesa: { tipo: "texto", placeholder: "Nº mesa/comanda" },
			origem: { tipo: "opcoes", opcoes: ORIGEM_OPCOES_FILTRO },
			pagamento: { tipo: "opcoes", opcoes: PAGAMENTO_OPCOES_FILTRO },
			valortotal: { tipo: "nenhum" },
			sync_status: { tipo: "opcoes", opcoes: SYNC_OPCOES_FILTRO },
			nfce_status: { tipo: "opcoes", opcoes: NFCE_OPCOES_FILTRO },
		};
	}, []);

	const vendasFiltradas = useMemo(() => {
		const filtradas = filtrarVendas(vendas, filtrosColuna);
		return ordenarVendas(filtradas, ordenarPor, ordem);
	}, [vendas, filtrosColuna, ordenarPor, ordem]);

	const pageCount = Math.max(
		1,
		Math.ceil(vendasFiltradas.length / pagination.pageSize) || 1,
	);

	const vendasPagina = useMemo(() => {
		const inicio = pagination.pageIndex * pagination.pageSize;
		return vendasFiltradas.slice(inicio, inicio + pagination.pageSize);
	}, [vendasFiltradas, pagination.pageIndex, pagination.pageSize]);

	useEffect(() => {
		if (pagination.pageIndex > 0 && pagination.pageIndex >= pageCount) {
			setPagination((p) => ({ ...p, pageIndex: Math.max(0, pageCount - 1) }));
		}
	}, [pagination.pageIndex, pageCount]);

	const columns = useMemo(
		() =>
			criarColunasVendas({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				retransmitindoId,
				onRetransmitir: (id) => void retransmitir(id),
				onInutilizar: setInutilizarVendaId,
				onCancelar: setCancelarVendaId,
				onReimprimir: (id) => void pdvInvoke("reimprimir", id),
				idsExpandidos,
				carregandoItensId,
				onToggleExpandir: (id) => void onToggleExpandir(id),
			}),
		[
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
			retransmitindoId,
			idsExpandidos,
			carregandoItensId,
			onToggleExpandir,
		],
	);

	const table = useReactTable({
		data: vendasPagina,
		columns,
		state: { pagination, columnVisibility },
		onPaginationChange: setPagination,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount,
	});

	const colunasVisiveis = table.getVisibleLeafColumns();
	const comFiltros = filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PdvShell
			status={status}
			onBlockedNavigate={setMsg}
			topbar={
				<Topbar
					title="Vendas do PDV"
					subtitle="Histórico local com status de sincronização e NFC-e"
					right={
						<Button
							variant="secondary"
							size="sm"
							onClick={() => navigate(rotaHomePdv(status))}
						>
							Voltar{" "}
							{status?.moduloGourmet
								? `às ${rotulo.plural.toLowerCase()}`
								: "ao PDV"}
						</Button>
					}
				/>
			}
			footer={
				<>
					<DialogInutilizarNfce
						aberto={inutilizarVendaId != null}
						vendaId={inutilizarVendaId}
						onFechar={() => setInutilizarVendaId(null)}
						onSucesso={(mensagem) => {
							setMsg(mensagem);
							void load();
						}}
					/>
					<DialogCancelarNfce
						aberto={cancelarVendaId != null}
						vendaId={cancelarVendaId}
						onFechar={() => setCancelarVendaId(null)}
						onSucesso={(mensagem) => {
							setMsg(mensagem);
							void load();
						}}
					/>
					<FunctionBar
						actions={[
							{
								key: "nao-sincronizadas",
								label: "Não sincronizadas",
								variant: "default",
								onClick: () => navigate("/vendas/nao-sincronizadas"),
							},
							{
								key: "atualizar",
								label: "Atualizar",
								hotkey: teclas.sincronizar,
								variant: "secondary",
								onClick: () => void load(),
								disabled: loading,
							},
							{
								key: "voltar",
								label: "Voltar",
								hotkey: "Escape",
								variant: "outline",
								onClick: () => navigate(rotaHomePdv(status)),
							},
						]}
					/>
				</>
			}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
					{msg ? (
						<p className="rounded-md bg-muted px-3 py-2 text-sm ring-1 ring-foreground/10">
							{msg}
						</p>
					) : (
						<p className="text-sm text-muted-foreground">
							{loading
								? "Carregando…"
								: `${vendasFiltradas.length} venda${vendasFiltradas.length === 1 ? "" : "s"}`}
						</p>
					)}
					<div className="flex flex-wrap items-center gap-2">
						{comFiltros ? (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setFiltrosColuna(filtrosColunaVendasVazios);
									setOrdenarPor(null);
									setOrdem(null);
									setPagination((p) => ({ ...p, pageIndex: 0 }));
								}}
							>
								Limpar filtros
							</Button>
						) : null}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm">
									<Columns3 className="size-4" />
									<span className="hidden sm:inline">Personalizar Colunas</span>
									<span className="sm:hidden">Colunas</span>
									<ChevronDown className="size-4" />
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
											{rotuloColunaVendas(column)}
										</DropdownMenuCheckboxItem>
									))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div className="pdv-surface flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="min-h-0 flex-1 overflow-auto">
						<Table>
							<TableHeader className="sticky top-0 z-10 bg-card">
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
											{loading
												? "Carregando vendas…"
												: comFiltros
													? "Nenhuma venda encontrada para os filtros selecionados."
													: "Nenhuma venda local ainda."}
										</TableCell>
									</TableRow>
								) : (
									table.getRowModel().rows.map((row) => {
										const expandido = idsExpandidos.has(row.original.id);
										const itens = itensPorVenda[row.original.id];
										const carregandoItens =
											carregandoItensId === row.original.id;
										return (
											<Fragment key={row.id}>
												<TableRow>
													{row.getVisibleCells().map((cell) => (
														<TableCell key={cell.id}>
															{flexRender(
																cell.column.columnDef.cell,
																cell.getContext(),
															)}
														</TableCell>
													))}
												</TableRow>
												{expandido ? (
													<TableRow className="bg-muted/30 hover:bg-muted/30">
														<TableCell
															colSpan={colunasVisiveis.length}
															className="whitespace-normal p-0"
														>
															{(() => {
																const numeracao = rotuloNumeracaoNfce(
																	row.original,
																);
																const cabecalhoNfce = numeracao ? (
																	<p className="mb-2 text-sm text-muted-foreground">
																		NFC-e{" "}
																		<span className="font-mono tabular-nums text-foreground">
																			{numeracao}
																		</span>
																		{row.original.nfce_chave ? (
																			<span className="ml-2 break-all font-mono text-xs">
																				· Chave {row.original.nfce_chave}
																			</span>
																		) : null}
																	</p>
																) : null;

																if (carregandoItens && !itens) {
																	return (
																		<div className="px-4 py-3">
																			{cabecalhoNfce}
																			<p className="text-sm text-muted-foreground">
																				Carregando produtos…
																			</p>
																		</div>
																	);
																}
																if (!itens || itens.length === 0) {
																	return (
																		<div className="px-4 py-3">
																			{cabecalhoNfce}
																			<p className="text-sm text-muted-foreground">
																				Nenhum produto nesta venda.
																			</p>
																		</div>
																	);
																}
																return (
																	<div className="px-4 py-3">
																		{cabecalhoNfce}
																		<table className="w-full text-sm">
																			<thead>
																				<tr className="text-left text-muted-foreground">
																					<th className="pb-2 font-medium">
																						Produto
																					</th>
																					<th className="pb-2 pr-4 text-right font-medium">
																						Qtd
																					</th>
																					<th className="pb-2 pr-4 text-right font-medium">
																						Unit.
																					</th>
																					<th className="pb-2 text-right font-medium">
																						Total
																					</th>
																				</tr>
																			</thead>
																			<tbody>
																				{itens.map((item, index) => (
																					<tr
																						key={`${item.idproduto}-${index}`}
																						className="border-t border-border/60"
																					>
																						<td className="py-1.5 pr-4">
																							{item.descricao}
																						</td>
																						<td className="py-1.5 pr-4 text-right tabular-nums">
																							{item.quantidade}
																						</td>
																						<td className="py-1.5 pr-4 text-right tabular-nums">
																							{money(item.precounitario)}
																						</td>
																						<td className="py-1.5 text-right font-medium tabular-nums">
																							{money(item.precototal)}
																						</td>
																					</tr>
																				))}
																			</tbody>
																		</table>
																	</div>
																);
															})()}
														</TableCell>
													</TableRow>
												) : null}
											</Fragment>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>

					{vendasFiltradas.length > 0 ? (
						<div className="flex shrink-0 flex-col gap-3 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-2">
								<Label htmlFor="vendas-por-pagina" className="text-sm">
									Itens por página
								</Label>
								<Select
									id="vendas-por-pagina"
									className="h-8 w-[72px]"
									value={String(pagination.pageSize)}
									onChange={(e) => {
										table.setPageSize(Number(e.target.value));
										table.setPageIndex(0);
									}}
								>
									{[10, 20, 50, 100].map((n) => (
										<option key={n} value={n}>
											{n}
										</option>
									))}
								</Select>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">
									Página {pagination.pageIndex + 1} de {pageCount}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={!table.getCanPreviousPage()}
									onClick={() => table.previousPage()}
								>
									Anterior
								</Button>
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
					) : null}
				</div>
			</div>
		</PdvShell>
	);
}

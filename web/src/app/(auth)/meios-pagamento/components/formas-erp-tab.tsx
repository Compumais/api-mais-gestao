"use client";

import {
	IconChevronDown,
	IconLayoutColumns,
	IconPencil,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
	TABELA_FORMAS_ERP,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type TipoDocumentoFinanceiro,
	tipoDocumentoFinanceiroService,
} from "@/services/tipo-documento-financeiro.service";
import {
	COLUNA_PARA_CAMPO_FILTRO_FORMAS_ERP,
	type ConfigFiltroColunaFormasErp,
	criarColunasFormasErp,
	type DestinoFinanceiroForma,
	DESTINO_OPCOES_FILTRO,
	destinoDaForma,
	flagsDoDestino,
	type FiltrosColunaFormasErpState,
	filtrosColunaFormasErpVazios,
	FORMAS_NFE,
	FORMAS_NFE_OPCOES_FILTRO,
	visibilidadePadraoColunasFormasErp,
} from "../formas-erp-colunas";

const FORMULARIO_VAZIO = {
	descricao: "",
	formaNfe: "01",
	destino: "caixa" as DestinoFinanceiroForma,
	prazoDias: "0",
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

function filtrosColunaAtivos(filtros: FiltrosColunaFormasErpState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export function FormasErpTab() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const idPorPagina = useId();
	const [modalAberto, setModalAberto] = useState(false);
	const [idEdicao, setIdEdicao] = useState<string | null>(null);
	const [descricao, setDescricao] = useState(FORMULARIO_VAZIO.descricao);
	const [formaNfe, setFormaNfe] = useState(FORMULARIO_VAZIO.formaNfe);
	const [destino, setDestino] = useState<DestinoFinanceiroForma>(
		FORMULARIO_VAZIO.destino,
	);
	const [prazoDias, setPrazoDias] = useState(FORMULARIO_VAZIO.prazoDias);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaFormasErpState>(filtrosColunaFormasErpVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasFormasErp(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_FORMAS_ERP, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_FORMAS_ERP[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaFormasErp
	> => {
		return {
			descricao: { tipo: "texto", placeholder: "Descrição" },
			formapagamentonfe: {
				tipo: "opcoes",
				opcoes: FORMAS_NFE_OPCOES_FILTRO,
			},
			destino: {
				tipo: "opcoes",
				opcoes: DESTINO_OPCOES_FILTRO,
			},
			prazodias: { tipo: "texto", placeholder: "Prazo em dias" },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"tipos-documento-financeiro",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return tipoDocumentoFinanceiroService.listar({
				idempresa: empresa.id,
				inativo: 0,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.descricao
					? { descricao: filtrosColuna.descricao }
					: {}),
				...(filtrosColuna.formapagamentonfe
					? { formapagamentonfe: filtrosColuna.formapagamentonfe }
					: {}),
				...(filtrosColuna.destino
					? {
							destino: filtrosColuna.destino as DestinoFinanceiroForma,
						}
					: {}),
				...(filtrosColuna.prazodias
					? { prazodias: filtrosColuna.prazodias }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!empresa,
	});

	function resetarFormulario() {
		setIdEdicao(null);
		setDescricao(FORMULARIO_VAZIO.descricao);
		setFormaNfe(FORMULARIO_VAZIO.formaNfe);
		setDestino(FORMULARIO_VAZIO.destino);
		setPrazoDias(FORMULARIO_VAZIO.prazoDias);
	}

	function abrirNova() {
		resetarFormulario();
		setModalAberto(true);
	}

	const abrirEdicao = useCallback((forma: TipoDocumentoFinanceiro) => {
		setIdEdicao(forma.id);
		setDescricao(forma.descricao);
		setFormaNfe(forma.formapagamentonfe || "99");
		setDestino(destinoDaForma(forma));
		setPrazoDias(String(forma.prazodias ?? 0));
		setModalAberto(true);
	}, []);

	function aoMudarDestino(valor: DestinoFinanceiroForma) {
		setDestino(valor);
		if (valor === "caixa") {
			setPrazoDias("0");
			return;
		}
		if (!Number(prazoDias)) {
			setPrazoDias(valor === "recebivel" && formaNfe === "04" ? "1" : "30");
		}
	}

	const { mutate: popularPadrao, isPending: populando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return tipoDocumentoFinanceiroService.popularPadrao(empresa.id);
		},
		onSuccess: (criados) => {
			void queryClient.invalidateQueries({
				queryKey: ["tipos-documento-financeiro"],
			});
			toast.success(
				criados.length > 0
					? `${criados.length} forma(s) padrão criada(s)`
					: "Formas padrão já existiam",
			);
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao criar padrões",
			);
		},
	});

	const { mutate: salvarForma, isPending: salvando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const flags = flagsDoDestino(destino);
			const prazo =
				destino === "caixa" ? null : Math.max(0, Number(prazoDias) || 0);
			const dados = {
				descricao: descricao.trim(),
				formapagamentonfe: formaNfe,
				...flags,
				prazodias: prazo,
			};
			if (idEdicao) {
				return tipoDocumentoFinanceiroService.atualizar(idEdicao, dados);
			}
			return tipoDocumentoFinanceiroService.criar({
				idempresa: empresa.id,
				...dados,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["tipos-documento-financeiro"],
			});
			setModalAberto(false);
			resetarFormulario();
			toast.success(
				idEdicao ? "Forma atualizada" : "Forma de pagamento criada",
			);
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao salvar forma",
			);
		},
	});

	const columns = useMemo(
		() =>
			criarColunasFormasErp({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderAcoes: (forma) => (
					<div className="flex justify-end">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							aria-label={`Editar ${forma.descricao}`}
							onClick={() => abrirEdicao(forma)}
						>
							<IconPencil className="size-4" />
						</Button>
					</div>
				),
			}),
		[
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
			abrirEdicao,
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
		getRowId: (row) => row.id,
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const colunasVisiveis = table.getVisibleLeafColumns();
	const mostrarSkeleton = isLoading || isLoadingPreferencias;
	const comFiltros = filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;
	const semRegistros = (data?.paginacao.total ?? 0) === 0 && !comFiltros;

	if (!empresa) {
		return (
			<p className="px-4 text-muted-foreground">
				Selecione uma empresa para visualizar as formas de pagamento.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-2 px-4">
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						onClick={() => popularPadrao()}
						disabled={populando}
					>
						{populando ? "Criando..." : "Criar formas padrão"}
					</Button>
					<Button onClick={abrirNova}>Nova forma ERP</Button>
				</div>
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
			</div>

			<p className="px-4 text-sm text-muted-foreground">
				O cupom do PDV só gera contas a receber quando a forma estiver marcada
				como contas a receber. Dinheiro e PIX ficam no caixa; cartão de crédito,
				cheque e crediário podem gerar título — inclusive com prazo diferente
				por bandeira (cadastre uma forma para cada bandeira, ex.: Visa crédito).
			</p>

			<div className="mx-4 rounded-lg border bg-card">
				{mostrarSkeleton ? (
					<TableSkeleton columns={colunasVisiveis.length || 5} rows={6}>
						{colunasVisiveis.map((coluna) => (
							<TableHead
								key={coluna.id}
								className={coluna.id === "acoes" ? "w-12" : undefined}
							>
								{rotuloColuna(coluna)}
							</TableHead>
						))}
					</TableSkeleton>
				) : semRegistros ? (
					<div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
						<p>Nenhuma forma ERP cadastrada.</p>
						<Button variant="outline" onClick={() => popularPadrao()}>
							Criar Dinheiro, PIX, Cartão, Cheque e Boleto
						</Button>
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
													header.id === "acoes" ? "w-12 text-right" : ""
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
											Nenhuma forma ERP encontrada para os filtros
											selecionados.
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

			<Dialog
				open={modalAberto}
				onOpenChange={(aberto) => {
					setModalAberto(aberto);
					if (!aberto) resetarFormulario();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{idEdicao
								? "Editar forma de pagamento"
								: "Nova forma de pagamento (ERP)"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<Field>
							<FieldLabel>Descrição</FieldLabel>
							<Input
								value={descricao}
								onChange={(event) => setDescricao(event.target.value)}
								maxLength={50}
								placeholder="Visa crédito"
							/>
						</Field>
						<Field>
							<FieldLabel>Forma NF-e (tPag)</FieldLabel>
							<Select value={formaNfe} onValueChange={setFormaNfe}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FORMAS_NFE.map((forma) => (
										<SelectItem key={forma.codigo} value={forma.codigo}>
											{forma.codigo} — {forma.descricao}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>
						<Field>
							<FieldLabel>Gera contas a receber?</FieldLabel>
							<Select
								value={destino}
								onValueChange={(valor) =>
									aoMudarDestino(valor as DestinoFinanceiroForma)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="caixa">
										Não — caixa imediato (dinheiro, PIX, débito)
									</SelectItem>
									<SelectItem value="recebivel">
										Sim — recebível de cartão/operadora (sem cliente)
									</SelectItem>
									<SelectItem value="contas_receber">
										Sim — contas a receber do cliente (cheque, crediário)
									</SelectItem>
								</SelectContent>
							</Select>
						</Field>
						{destino !== "caixa" ? (
							<Field>
								<FieldLabel>Prazo (dias)</FieldLabel>
								<Input
									type="number"
									min={0}
									value={prazoDias}
									onChange={(event) => setPrazoDias(event.target.value)}
								/>
							</Field>
						) : null}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setModalAberto(false);
								resetarFormulario();
							}}
						>
							Cancelar
						</Button>
						<Button
							onClick={() => salvarForma()}
							disabled={salvando || !descricao.trim()}
						>
							{salvando ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

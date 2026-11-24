"use client";

import {
	IconChevronDown,
	IconDotsVertical,
	IconLayoutColumns,
	IconPencil,
	IconSearch,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useCallback, useId, useMemo, useState } from "react";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
	useContaCorrenteLancamentos,
	useDeletarContaCorrenteLancamento,
} from "@/hooks/use-conta-corrente-lancamento";
import {
	TABELA_MOVIMENTACOES,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import { extrairPeriodoFiltro, serializarPeriodoFiltro } from "@/lib/date";
import type { ContaCorrenteLancamento } from "@/services/conta-corrente-lancamento.service";
import {
	COLUNA_PARA_CAMPO_FILTRO_MOVIMENTACAO,
	type ConfigFiltroColunaMovimentacao,
	criarColunasMovimentacoes,
	type FiltrosColunaMovimentacoesState,
	filtrosColunaMovimentacoesVazios,
	SENTIDO_OPCOES_FILTRO,
	visibilidadePadraoColunasMovimentacoes,
} from "../movimentacoes-colunas";
import { MovimentacoesTableSkeleton } from "./movimentacoes-table-skeleton";

interface MovimentacoesTableProps {
	idcontacorrente: string;
	onEdit: (lancamento: ContaCorrenteLancamento) => void;
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

function filtrosColunaAtivos(filtros: FiltrosColunaMovimentacoesState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

type FiltrosBarraMovimentacoes = {
	clienteFornecedor: string;
	dataInicio: string;
	dataFim: string;
	valorMin: string;
	valorMax: string;
};

const filtrosBarraVazios: FiltrosBarraMovimentacoes = {
	clienteFornecedor: "",
	dataInicio: "",
	dataFim: "",
	valorMin: "",
	valorMax: "",
};

function filtrosBarraAtivos(filtros: FiltrosBarraMovimentacoes) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export function MovimentacoesTable({
	idcontacorrente,
	onEdit,
}: MovimentacoesTableProps) {
	const idPorPagina = useId();
	const idBuscaPessoa = useId();
	const idDataInicio = useId();
	const idDataFim = useId();
	const idValorMin = useId();
	const idValorMax = useId();

	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaMovimentacoesState>(filtrosColunaMovimentacoesVazios);
	const [rascunhoBarra, setRascunhoBarra] =
		useState<FiltrosBarraMovimentacoes>(filtrosBarraVazios);
	const [filtrosBarra, setFiltrosBarra] =
		useState<FiltrosBarraMovimentacoes>(filtrosBarraVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasMovimentacoes(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_MOVIMENTACOES, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_MOVIMENTACAO[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		if (campo === "datahora") {
			const periodo = extrairPeriodoFiltro(valor);
			setRascunhoBarra((b) => ({
				...b,
				dataInicio: periodo.inicio,
				dataFim: periodo.fim,
			}));
			setFiltrosBarra((b) => ({
				...b,
				dataInicio: periodo.inicio,
				dataFim: periodo.fim,
			}));
		} else if (campo === "entidadenome") {
			setRascunhoBarra((b) => ({ ...b, clienteFornecedor: valor }));
			setFiltrosBarra((b) => ({ ...b, clienteFornecedor: valor }));
		}
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const aplicarFiltrosBarra = useCallback(() => {
		let inicio = rascunhoBarra.dataInicio.trim();
		let fim = rascunhoBarra.dataFim.trim();
		if (inicio && fim && inicio > fim) {
			[inicio, fim] = [fim, inicio];
		}
		let min = rascunhoBarra.valorMin.trim();
		let max = rascunhoBarra.valorMax.trim();
		const minNum = Number(min.replace(",", "."));
		const maxNum = Number(max.replace(",", "."));
		if (
			min &&
			max &&
			Number.isFinite(minNum) &&
			Number.isFinite(maxNum) &&
			minNum > maxNum
		) {
			[min, max] = [max, min];
		}

		const normalizado: FiltrosBarraMovimentacoes = {
			clienteFornecedor: rascunhoBarra.clienteFornecedor.trim(),
			dataInicio: inicio,
			dataFim: fim,
			valorMin: min,
			valorMax: max,
		};
		setRascunhoBarra(normalizado);
		setFiltrosBarra(normalizado);
		setFiltrosColuna((atual) => ({
			...atual,
			datahora: serializarPeriodoFiltro(inicio, fim),
			entidadenome: normalizado.clienteFornecedor,
		}));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, [rascunhoBarra]);

	const limparTodosFiltros = useCallback(() => {
		setRascunhoBarra(filtrosBarraVazios);
		setFiltrosBarra(filtrosBarraVazios);
		setFiltrosColuna(filtrosColunaMovimentacoesVazios);
		setOrdenarPor(null);
		setOrdem(null);
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaMovimentacao
	> => {
		return {
			datahora: { tipo: "periodo" },
			entidadenome: { tipo: "texto", placeholder: "Cliente / Fornecedor" },
			historico: { tipo: "texto", placeholder: "Histórico" },
			entrada: { tipo: "opcoes", opcoes: SENTIDO_OPCOES_FILTRO },
			saida: { tipo: "nenhum" },
			saldoatual: { tipo: "nenhum" },
			planocontasnome: { tipo: "texto", placeholder: "Plano" },
			documento: { tipo: "texto", placeholder: "Documento" },
		};
	}, []);

	const periodoColuna = extrairPeriodoFiltro(filtrosColuna.datahora);
	const dataInicioEfetiva = filtrosBarra.dataInicio || periodoColuna.inicio;
	const dataFimEfetiva = filtrosBarra.dataFim || periodoColuna.fim;
	const pessoaEfetiva =
		filtrosBarra.clienteFornecedor || filtrosColuna.entidadenome;

	const { data, isLoading } = useContaCorrenteLancamentos({
		idcontacorrente,
		page: pagination.pageIndex + 1,
		limit: pagination.pageSize,
		historico: filtrosColuna.historico || undefined,
		documento: filtrosColuna.documento || undefined,
		planocontasnome: filtrosColuna.planocontasnome || undefined,
		clienteFornecedor: pessoaEfetiva || undefined,
		dataInicio: dataInicioEfetiva || undefined,
		dataFim: dataFimEfetiva || undefined,
		valorMin: filtrosBarra.valorMin || undefined,
		valorMax: filtrosBarra.valorMax || undefined,
		sentido:
			filtrosColuna.sentido === "entrada" || filtrosColuna.sentido === "saida"
				? filtrosColuna.sentido
				: undefined,
		ordenarPor: ordenarPor ?? undefined,
		ordem: ordem ?? undefined,
	});

	const { mutate: deletarLancamento } = useDeletarContaCorrenteLancamento();

	const handleDelete = useCallback(
		(id: string) => {
			if (
				confirm(
					"Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.",
				)
			) {
				deletarLancamento(id);
			}
		},
		[deletarLancamento],
	);

	const columns = useMemo(
		() =>
			criarColunasMovimentacoes({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderAcoes: (lancamento) => (
					<div className="flex justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									aria-label="Abrir menu de ações"
								>
									<IconDotsVertical className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => onEdit(lancamento)}>
									<IconPencil className="size-4" />
									Editar
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() => handleDelete(lancamento.id)}
								>
									<IconTrash className="size-4" />
									Excluir
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
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
			onEdit,
			handleDelete,
		],
	);

	const table = useReactTable({
		data: data?.data ?? [],
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
	const comFiltros =
		filtrosColunaAtivos(filtrosColuna) ||
		filtrosBarraAtivos(filtrosBarra) ||
		!!ordenarPor;

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-lg border bg-card p-4">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1.5fr)_1fr_1fr_1fr_1fr_auto] lg:items-end">
					<div className="space-y-1.5">
						<Label htmlFor={idBuscaPessoa}>Cliente / Fornecedor</Label>
						<Input
							id={idBuscaPessoa}
							type="text"
							placeholder="Buscar por cliente ou fornecedor..."
							value={rascunhoBarra.clienteFornecedor}
							onChange={(e) =>
								setRascunhoBarra((b) => ({
									...b,
									clienteFornecedor: e.target.value,
								}))
							}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									aplicarFiltrosBarra();
								}
							}}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idDataInicio}>Data início</Label>
						<Input
							id={idDataInicio}
							type="date"
							value={rascunhoBarra.dataInicio}
							onChange={(e) =>
								setRascunhoBarra((b) => ({ ...b, dataInicio: e.target.value }))
							}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									aplicarFiltrosBarra();
								}
							}}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idDataFim}>Data fim</Label>
						<Input
							id={idDataFim}
							type="date"
							value={rascunhoBarra.dataFim}
							onChange={(e) =>
								setRascunhoBarra((b) => ({ ...b, dataFim: e.target.value }))
							}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									aplicarFiltrosBarra();
								}
							}}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idValorMin}>Valor mín. (R$)</Label>
						<Input
							id={idValorMin}
							type="number"
							step="0.01"
							min="0"
							placeholder="0,00"
							value={rascunhoBarra.valorMin}
							onChange={(e) =>
								setRascunhoBarra((b) => ({ ...b, valorMin: e.target.value }))
							}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									aplicarFiltrosBarra();
								}
							}}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idValorMax}>Valor máx. (R$)</Label>
						<Input
							id={idValorMax}
							type="number"
							step="0.01"
							min="0"
							placeholder="0,00"
							value={rascunhoBarra.valorMax}
							onChange={(e) =>
								setRascunhoBarra((b) => ({ ...b, valorMax: e.target.value }))
							}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									aplicarFiltrosBarra();
								}
							}}
						/>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button type="button" onClick={aplicarFiltrosBarra}>
							<IconSearch className="size-4" />
							Filtrar
						</Button>
						{comFiltros && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={limparTodosFiltros}
							>
								<IconX className="size-4" />
								Limpar
							</Button>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center justify-end">
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

			{mostrarSkeleton ? (
				<MovimentacoesTableSkeleton />
			) : (
				<div className="overflow-hidden rounded-lg border bg-card">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className={
											header.id === "entrada" ||
											header.id === "saida" ||
											header.id === "saldoatual"
												? "text-right"
												: header.id === "acoes"
													? "text-right"
													: undefined
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
									className="h-24 text-center"
								>
									{comFiltros
										? "Nenhuma movimentação encontrada para os filtros selecionados."
										: "Nenhum resultado encontrado."}
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
							Página {pagination.pageIndex + 1} de {data.paginacao.totalPages} (
							{data.paginacao.total} registros)
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
				</div>
			)}
		</div>
	);
}

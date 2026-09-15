"use client";

import {
	IconChevronDown,
	IconLayoutColumns,
	IconTrash,
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
	TABELA_BANDEIRAS_CARTAO,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type BandeiraCartao,
	bandeiraCartaoService,
} from "@/services/bandeira-cartao.service";
import {
	COLUNA_PARA_CAMPO_FILTRO_BANDEIRA_CARTAO,
	type ConfigFiltroColunaBandeiraCartao,
	criarColunasBandeirasCartao,
	type FiltrosColunaBandeirasCartaoState,
	filtrosColunaBandeirasCartaoVazios,
	STATUS_OPCOES_FILTRO,
	visibilidadePadraoColunasBandeirasCartao,
} from "../bandeiras-cartao-colunas";

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

function filtrosColunaAtivos(filtros: FiltrosColunaBandeirasCartaoState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export function BandeirasCartaoTab() {
	const queryClient = useQueryClient();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const idPorPagina = useId();
	const [modalAberto, setModalAberto] = useState(false);
	const [descricao, setDescricao] = useState("");
	const [codigo, setCodigo] = useState("");
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaBandeirasCartaoState>(
			filtrosColunaBandeirasCartaoVazios,
		);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasBandeirasCartao(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_BANDEIRAS_CARTAO, visibilidadePadrao);

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
		const campo = COLUNA_PARA_CAMPO_FILTRO_BANDEIRA_CARTAO[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaBandeiraCartao
	> => {
		return {
			descricao: { tipo: "texto", placeholder: "Descrição" },
			codigo: { tipo: "texto", placeholder: "Código" },
			status: {
				tipo: "opcoes",
				opcoes: STATUS_OPCOES_FILTRO,
			},
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"bandeiras-cartao",
			empresa?.id,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return bandeiraCartaoService.listar({
				idempresa: empresa.id,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(filtrosColuna.descricao
					? { descricao: filtrosColuna.descricao }
					: {}),
				...(filtrosColuna.codigo ? { codigo: filtrosColuna.codigo } : {}),
				...(filtrosColuna.inativo !== ""
					? { inativo: Number(filtrosColuna.inativo) }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!empresa,
	});

	const { mutate: popularPadrao, isPending: populando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return bandeiraCartaoService.popularPadrao(empresa.id);
		},
		onSuccess: ({ criados }) => {
			void queryClient.invalidateQueries({ queryKey: ["bandeiras-cartao"] });
			toast.success(
				criados > 0
					? `${criados} bandeira(s) padrão criada(s)`
					: "Bandeiras padrão já existiam",
			);
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao criar bandeiras padrão",
			);
		},
	});

	const { mutate: criarBandeira, isPending: criando } = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return bandeiraCartaoService.criar({
				idempresa: empresa.id,
				descricao: descricao.trim(),
				codigo: codigo.trim() || null,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["bandeiras-cartao"] });
			setModalAberto(false);
			setDescricao("");
			setCodigo("");
			toast.success("Bandeira criada");
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao criar bandeira",
			);
		},
	});

	const { mutate: excluirBandeira } = useMutation({
		mutationFn: bandeiraCartaoService.deletar,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["bandeiras-cartao"] });
			toast.success("Bandeira excluída");
		},
		onError: (erro) => {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao excluir bandeira",
			);
		},
	});

	const handleExcluir = useCallback(
		(bandeira: BandeiraCartao) => {
			toast.message(`Excluir a bandeira ${bandeira.descricao}?`, {
				position: "top-center",
				action: {
					label: "Excluir",
					onClick: () => excluirBandeira(bandeira.id),
				},
			});
		},
		[excluirBandeira],
	);

	const columns = useMemo(
		() =>
			criarColunasBandeirasCartao({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderAcoes: (bandeira) => (
					<div className="flex justify-end">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							aria-label={`Excluir ${bandeira.descricao}`}
							onClick={() => handleExcluir(bandeira)}
						>
							<IconTrash className="size-4" />
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
			handleExcluir,
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
				Selecione uma empresa para visualizar as bandeiras de cartão.
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
						{populando ? "Criando..." : "Criar bandeiras padrão"}
					</Button>
					<Button onClick={() => setModalAberto(true)}>Nova bandeira</Button>
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
				Bandeiras usadas no PDV ao lançar cartão sem SiTef e gravadas no
				financeiro. Visa, Mastercard, Elo e outras podem ser criadas em lote.
			</p>

			<div className="mx-4 rounded-lg border bg-card">
				{mostrarSkeleton ? (
					<TableSkeleton columns={colunasVisiveis.length || 4} rows={6}>
						{colunasVisiveis.map((coluna) => (
							<TableHead
								key={coluna.id}
								className={
									coluna.id === "acoes" ? "w-12 text-end" : undefined
								}
							>
								{rotuloColuna(coluna)}
							</TableHead>
						))}
					</TableSkeleton>
				) : semRegistros ? (
					<div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
						<p>Nenhuma bandeira cadastrada.</p>
						<Button variant="outline" onClick={() => popularPadrao()}>
							Criar Visa, Mastercard, Elo e outras
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
											Nenhuma bandeira encontrada para os filtros selecionados.
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

			<Dialog open={modalAberto} onOpenChange={setModalAberto}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Nova bandeira de cartão</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<Field>
							<FieldLabel>Descrição</FieldLabel>
							<Input
								value={descricao}
								onChange={(event) => setDescricao(event.target.value)}
								maxLength={60}
								placeholder="Visa"
							/>
						</Field>
						<Field>
							<FieldLabel>Código (opcional)</FieldLabel>
							<Input
								value={codigo}
								onChange={(event) => setCodigo(event.target.value)}
								maxLength={30}
								placeholder="visa"
							/>
						</Field>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setModalAberto(false)}>
							Cancelar
						</Button>
						<Button
							onClick={() => criarBandeira()}
							disabled={criando || !descricao.trim()}
						>
							{criando ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

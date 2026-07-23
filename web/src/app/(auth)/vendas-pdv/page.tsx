"use client";

import {
	IconEye,
	IconFilter,
	IconReceipt,
	IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/table-skeleton";
import { useEmpresa } from "@/hooks/use-empresa";
import { formatCurrency } from "@/lib/gourmet-utils";
import { produtosService } from "@/services/produtos.service";
import type { VendaPdvGourmet } from "@/services/venda-pdv-gourmet.service";
import { vendaPdvGourmetService } from "@/services/venda-pdv-gourmet.service";
import { vendaPdvItemService } from "@/services/venda-pdv-item.service";
import type { VendaPdvItem } from "@/services/venda-pdv-item.service";
import { usuariosService } from "@/services/usuarios.service";
import { PageContainer } from "../components/page-container";

dayjs.locale("pt-br");

// ─── tipos ───────────────────────────────────────────────────────────────────

interface FiltrosState {
	dataInicio: string;
	dataFim: string;
	numeropdv: string;
}

const filtrosVazios: FiltrosState = {
	dataInicio: "",
	dataFim: "",
	numeropdv: "",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function tipoVenda(venda: VendaPdvGourmet) {
	if (venda.idcontamesa) return "Mesa";
	// vendalocal: 2 = app POS; 1 = balcão web/gourmet; 0/null = legado
	if (venda.vendalocal === 2) return "POS";
	return "Balcão";
}

function calcularTotal(itens: VendaPdvItem[]): number {
	return itens.reduce(
		(acc, item) => acc + Number.parseFloat(item.precototal ?? "0"),
		0,
	);
}

function filtrosAtivos(filtros: FiltrosState): boolean {
	return !!(filtros.dataInicio || filtros.dataFim || filtros.numeropdv);
}

// ─── dialog de itens ─────────────────────────────────────────────────────────

function ItensVendaDialog({
	venda,
	idempresa,
	open,
	onOpenChange,
	produtosPorId,
	operadorNome,
}: {
	venda: VendaPdvGourmet | null;
	idempresa: string;
	open: boolean;
	onOpenChange: (v: boolean) => void;
	produtosPorId: Record<string, string>;
	operadorNome: string;
}) {
	const { data, isLoading } = useQuery({
		queryKey: ["vendas-pdv-item", venda?.id, idempresa],
		queryFn: () =>
			vendaPdvItemService.listar({
				idempresa,
				idvenda: venda!.id,
				limit: 100,
			}),
		enabled: !!venda && open,
	});

	const itens = data?.data ?? [];
	const total = calcularTotal(itens);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<IconReceipt className="size-5" />
						Venda Nº {venda?.numeropdv}
					</DialogTitle>
					<DialogDescription>
						{venda && dayjs(venda.datacriacao).format("DD/MM/YYYY [às] HH:mm")}{" "}
						— {venda && tipoVenda(venda)}
						{operadorNome && (
							<> &nbsp;•&nbsp; Operador: <strong>{operadorNome}</strong></>
						)}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i.toString()}
								className="h-10 rounded bg-muted animate-pulse"
							/>
						))}
					</div>
				) : itens.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						Nenhum item encontrado para esta venda.
					</p>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Produto</TableHead>
									<TableHead className="w-24 text-right">Qtd.</TableHead>
									<TableHead className="w-32 text-right">Preço unit.</TableHead>
									<TableHead className="w-32 text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{itens.map((item) => (
									<TableRow key={item.id}>
										<TableCell className="text-sm font-medium">
											{produtosPorId[item.idproduto] ?? item.idproduto}
										</TableCell>
										<TableCell className="text-right text-sm">
											{Number.parseFloat(item.quantidade).toLocaleString(
												"pt-BR",
												{ maximumFractionDigits: 3 },
											)}
										</TableCell>
										<TableCell className="text-right text-sm">
											{formatCurrency(item.precounitario)}
										</TableCell>
										<TableCell className="text-right font-medium">
											{formatCurrency(item.precototal)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						<div className="flex justify-end border-t pt-3">
							<p className="text-sm font-semibold">
								Total:{" "}
								<span className="text-primary text-base">
									{formatCurrency(total.toFixed(2))}
								</span>
							</p>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

// ─── página principal ─────────────────────────────────────────────────────────

export default function VendasPdvPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const [filtros, setFiltros] = useState<FiltrosState>(filtrosVazios);
	const [filtrosAplicados, setFiltrosAplicados] =
		useState<FiltrosState>(filtrosVazios);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 15,
	});

	const [vendaSelecionada, setVendaSelecionada] =
		useState<VendaPdvGourmet | null>(null);
	const [dialogItensAberto, setDialogItensAberto] = useState(false);

	// ── mapas de resolução ─────────────────────────────────────────────────────

	const { data: usuariosData } = useQuery({
		queryKey: ["usuarios-lista", empresa?.id],
		queryFn: () =>
			usuariosService.listar({ idempresa: empresa!.id, limit: 500 }),
		enabled: !!empresa,
		staleTime: 60_000,
	});

	const usuariosPorId = useMemo(() => {
		const map: Record<string, string> = {};
		for (const u of usuariosData?.data ?? []) {
			map[u.id] = u.nome;
		}
		return map;
	}, [usuariosData]);

	const { data: produtosData } = useQuery({
		queryKey: ["produtos-lista", empresa?.id],
		queryFn: () =>
			produtosService.listarTodos({ idempresa: empresa!.id, inativo: 0 }),
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

	// ── vendas ─────────────────────────────────────────────────────────────────

	const { data, isLoading } = useQuery({
		queryKey: [
			"vendas-pdv-gourmet",
			empresa?.id,
			filtrosAplicados,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return vendaPdvGourmetService.listar({
				idempresa: empresa.id,
				dataInicio: filtrosAplicados.dataInicio || undefined,
				dataFim: filtrosAplicados.dataFim || undefined,
				numeropdv: filtrosAplicados.numeropdv
					? Number(filtrosAplicados.numeropdv)
					: undefined,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			});
		},
		enabled: !!empresa,
	});

	// ── handlers ───────────────────────────────────────────────────────────────

	const handleAplicarFiltros = () => {
		setPagination((p) => ({ ...p, pageIndex: 0 }));
		setFiltrosAplicados({ ...filtros });
	};

	const handleLimparFiltros = () => {
		setFiltros(filtrosVazios);
		setFiltrosAplicados(filtrosVazios);
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	};

	const handleVerItens = (venda: VendaPdvGourmet) => {
		setVendaSelecionada(venda);
		setDialogItensAberto(true);
	};

	// ── colunas ────────────────────────────────────────────────────────────────

	const columns: ColumnDef<VendaPdvGourmet>[] = [
		{
			accessorKey: "numeropdv",
			header: "Nº PDV",
			cell: ({ row }) => (
				<span className="font-mono font-medium">
					{row.getValue("numeropdv")}
				</span>
			),
		},
		{
			accessorKey: "datacriacao",
			header: "Data / Hora",
			cell: ({ row }) => {
				const val = row.getValue("datacriacao") as string | null;
				if (!val) return <span className="text-muted-foreground">—</span>;
				return <span>{dayjs(val).format("DD/MM/YYYY HH:mm")}</span>;
			},
		},
		{
			id: "tipo",
			header: "Tipo",
			cell: ({ row }) => {
				const tipo = tipoVenda(row.original);
				return (
					<Badge variant={tipo === "Mesa" ? "secondary" : "outline"}>
						{tipo}
					</Badge>
				);
			},
		},
		{
			accessorKey: "usuarioquefechouvenda",
			header: "Operador",
			cell: ({ row }) => {
				const id = row.getValue("usuarioquefechouvenda") as string;
				const nome = usuariosPorId[id] ?? id;
				return (
					<span className="text-sm text-muted-foreground truncate max-w-[200px] block">
						{nome}
					</span>
				);
			},
		},
		{
			id: "acoes",
			header: () => <span className="sr-only">Ações</span>,
			cell: ({ row }) => (
				<div className="flex justify-end">
					<Button
						variant="ghost"
						size="sm"
						className="gap-1.5"
						onClick={() => handleVerItens(row.original)}
					>
						<IconEye className="size-4" />
						Ver itens
					</Button>
				</div>
			),
		},
	];

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		state: { pagination },
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const comFiltros = filtrosAtivos(filtrosAplicados);

	const operadorSelecionadoNome = vendaSelecionada
		? (usuariosPorId[vendaSelecionada.usuarioquefechouvenda] ??
			vendaSelecionada.usuarioquefechouvenda)
		: "";

	// ── render ─────────────────────────────────────────────────────────────────

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				{/* cabeçalho */}
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Histórico de vendas PDV</h1>
					{comFiltros && (
						<Badge variant="secondary" className="gap-1">
							<IconFilter className="size-3" />
							Filtros ativos
						</Badge>
					)}
				</div>

				{/* filtros */}
				<div className="mx-4 rounded-lg border bg-card p-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<Field>
							<FieldLabel>Data início</FieldLabel>
							<FieldGroup>
								<Input
									type="date"
									value={filtros.dataInicio}
									onChange={(e) =>
										setFiltros((f) => ({ ...f, dataInicio: e.target.value }))
									}
								/>
							</FieldGroup>
						</Field>

						<Field>
							<FieldLabel>Data fim</FieldLabel>
							<FieldGroup>
								<Input
									type="date"
									value={filtros.dataFim}
									onChange={(e) =>
										setFiltros((f) => ({ ...f, dataFim: e.target.value }))
									}
								/>
							</FieldGroup>
						</Field>

						<Field>
							<FieldLabel>Nº do PDV</FieldLabel>
							<FieldGroup>
								<Input
									type="number"
									placeholder="Ex: 1"
									value={filtros.numeropdv}
									onChange={(e) =>
										setFiltros((f) => ({ ...f, numeropdv: e.target.value }))
									}
								/>
							</FieldGroup>
						</Field>

						<div className="flex items-end gap-2">
							<Button onClick={handleAplicarFiltros} className="flex-1 gap-2">
								<IconFilter className="size-4" />
								Filtrar
							</Button>
							{comFiltros && (
								<Button
									variant="outline"
									onClick={handleLimparFiltros}
									aria-label="Limpar filtros"
								>
									<IconX className="size-4" />
								</Button>
							)}
						</div>
					</div>
				</div>

				{/* tabela */}
				<div className="mx-4 rounded-lg border bg-card">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as vendas
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10} columns={5}>
							<TableHead>Nº PDV</TableHead>
							<TableHead>Data / Hora</TableHead>
							<TableHead>Tipo</TableHead>
							<TableHead>Operador</TableHead>
							<TableHead />
						</TableSkeleton>
					) : (
						<>
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((hg) => (
										<TableRow key={hg.id}>
											{hg.headers.map((header) => (
												<TableHead
													key={header.id}
													className={
														header.id === "acoes" ? "text-right" : ""
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

							{/* paginação */}
							{(data?.paginacao.totalPages ?? 0) > 0 && (
								<div className="flex items-center justify-between border-t px-4 py-3">
									<p className="text-sm text-muted-foreground">
										{data?.paginacao.total ?? 0} venda
										{(data?.paginacao.total ?? 0) !== 1 ? "s" : ""} •{" "}
										Página {pagination.pageIndex + 1} de{" "}
										{data?.paginacao.totalPages ?? 1}
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

			{/* dialog de itens */}
			{empresa && (
				<ItensVendaDialog
					venda={vendaSelecionada}
					idempresa={empresa.id}
					open={dialogItensAberto}
					onOpenChange={setDialogItensAberto}
					produtosPorId={produtosPorId}
					operadorNome={operadorSelecionadoNome}
				/>
			)}
		</PageContainer>
	);
}

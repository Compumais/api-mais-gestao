"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { IconPlus } from "@tabler/icons-react";
import { ExternalLink, FilterX, Plus, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
	DAV_STATUS,
	DAV_STATUS_LABELS,
	pedidoPodeFaturarNfe,
} from "@/constants/dav-status";
import { useEmpresa } from "@/hooks/use-empresa";
import { davService, type PedidoDav } from "@/services/dav.service";
import { entidadesService } from "@/services/entidades.service";
import { PageContainer } from "../components/page-container";

const formatarMoeda = (valor: string | null | undefined) => {
	const numero = parseFloat(valor ?? "0");
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number.isFinite(numero) ? numero : 0);
};

const formatarData = (data: string | null | undefined) => {
	if (!data) return "—";
	try {
		return new Date(data).toLocaleDateString("pt-BR");
	} catch {
		return data;
	}
};

function obterStatusPedido(pedido: PedidoDav) {
	if (pedido.idnotafiscal) return "NF-e emitida";
	if (pedido.status != null && DAV_STATUS_LABELS[pedido.status]) {
		return DAV_STATUS_LABELS[pedido.status];
	}
	return "—";
}

type FiltrosState = {
	dataInicio: string;
	dataFim: string;
	idcliente: string;
	statusFiltro: string;
	codigo: string;
	busca: string;
};

const filtrosVazios: FiltrosState = {
	dataInicio: "",
	dataFim: "",
	idcliente: "",
	statusFiltro: "",
	codigo: "",
	busca: "",
};

function filtrosAtivos(filtros: FiltrosState): boolean {
	return !!(
		filtros.dataInicio ||
		filtros.dataFim ||
		filtros.idcliente ||
		filtros.statusFiltro ||
		filtros.codigo ||
		filtros.busca
	);
}

export default function PedidosPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const origemPos = searchParams.get("origem")?.trim() || undefined;
	const filtrarOrigemPos = origemPos?.toUpperCase() === "POS";
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [page, setPage] = useState(1);
	const [filtros, setFiltros] = useState<FiltrosState>(filtrosVazios);
	const [filtrosAplicados, setFiltrosAplicados] =
		useState<FiltrosState>(filtrosVazios);
	const [pedidoCancelar, setPedidoCancelar] = useState<PedidoDav | null>(null);
	const limit = 20;

	const { data: entidadesLista } = useQuery({
		queryKey: ["entidades-pedido-lista", empresa?.id],
		queryFn: () =>
			entidadesService.listarTodos({
				idempresa: empresa?.id ?? "",
			}),
		enabled: !!empresa?.id,
	});

	const opcoesClientes = useMemo(
		() =>
			(entidadesLista ?? []).map((entidade) => ({
				value: entidade.id,
				label:
					entidade.razaosocial?.trim() ||
					entidade.nome?.trim() ||
					entidade.cnpjcpf ||
					entidade.id,
			})),
		[entidadesLista],
	);

	const { data, isLoading } = useQuery({
		queryKey: ["pedidos", empresa?.id, page, filtrosAplicados, origemPos],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");

			const statusFiltro = filtrosAplicados.statusFiltro;
			const faturado =
				statusFiltro === "faturado"
					? true
					: statusFiltro === "nao_faturado"
						? false
						: undefined;
			const status =
				statusFiltro &&
				statusFiltro !== "faturado" &&
				statusFiltro !== "nao_faturado"
					? Number(statusFiltro)
					: undefined;

			return davService.listar({
				idempresa: empresa.id,
				page,
				limit,
				dataInicio: filtrosAplicados.dataInicio || undefined,
				dataFim: filtrosAplicados.dataFim || undefined,
				idcliente: filtrosAplicados.idcliente || undefined,
				status,
				faturado,
				codigo: filtrosAplicados.codigo
					? Number(filtrosAplicados.codigo)
					: undefined,
				busca: filtrosAplicados.busca || undefined,
				origem: origemPos,
			});
		},
		enabled: !!empresa?.id,
	});

	const { mutate: criarPedido, isPending: criandoPedido } = useMutation({
		mutationFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			const agora = new Date();
			return davService.criar({
				idempresa: empresa.id,
				status: 0,
				tipodocumento: 4,
				data: agora.toISOString().slice(0, 10),
				datainclusao: agora.toISOString(),
				currenttimemillis: agora.getTime(),
			});
		},
		onSuccess: (pedido) => {
			void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
			toast.success("Pedido criado");
			router.push(`/pedidos/${pedido.id}`);
		},
		onError: (erro) => {
			toast.error("Erro ao criar pedido", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const { mutate: cancelarPedido, isPending: cancelando } = useMutation({
		mutationFn: async (pedido: PedidoDav) => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return davService.cancelar(pedido.id, empresa.id);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
			setPedidoCancelar(null);
			toast.success("Pedido cancelado");
		},
		onError: (erro) => {
			toast.error("Erro ao cancelar pedido", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const pedidos = data?.data ?? [];
	const totalPages = data?.paginacao.totalPages ?? 1;

	const colunas = useMemo<ColumnDef<PedidoDav>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label="Selecionar todos"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						disabled={!row.getCanSelect()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Selecionar pedido"
					/>
				),
				enableSorting: false,
			},
			{
				accessorKey: "codigo",
				header: "Código",
				cell: ({ row }) => (
					<span className="font-medium">{row.original.codigo ?? "—"}</span>
				),
			},
			{
				id: "cliente",
				header: "Cliente",
				cell: ({ row }) => (
					<div className="max-w-[220px] truncate">
						{row.original.nomecliente ?? "Sem cliente"}
					</div>
				),
			},
			{
				id: "data",
				header: "Data",
				cell: ({ row }) =>
					formatarData(row.original.data ?? row.original.datainclusao),
			},
			{
				id: "valor",
				header: "Valor",
				cell: ({ row }) => formatarMoeda(row.original.valor),
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => {
					const label = obterStatusPedido(row.original);
					const faturado = !!row.original.idnotafiscal;
					const cancelado = row.original.status === DAV_STATUS.CANCELADO;
					return (
						<Badge
							variant={
								faturado ? "default" : cancelado ? "destructive" : "secondary"
							}
						>
							{label}
						</Badge>
					);
				},
			},
			{
				id: "acoes",
				header: "",
				cell: ({ row }) => {
					const pedido = row.original;
					const podeCancelar =
						!pedido.idnotafiscal && pedido.status !== DAV_STATUS.CANCELADO;
					return (
						<div className="flex justify-end gap-2">
							{pedido.idnotafiscal && (
								<Button variant="ghost" size="sm" asChild>
									<Link href={`/nota-fiscal-venda/${pedido.idnotafiscal}`}>
										<ExternalLink className="h-4 w-4" />
										NF-e
									</Link>
								</Button>
							)}
							{podeCancelar && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setPedidoCancelar(pedido)}
								>
									<XCircle className="h-4 w-4" />
									Cancelar
								</Button>
							)}
							<Button variant="outline" size="sm" asChild>
								<Link href={`/pedidos/${pedido.id}`}>Abrir</Link>
							</Button>
						</div>
					);
				},
			},
		],
		[],
	);

	const tabela = useReactTable({
		data: pedidos,
		columns: colunas,
		state: { sorting, rowSelection },
		onSortingChange: setSorting,
		onRowSelectionChange: (updater) => {
			const next =
				typeof updater === "function" ? updater(rowSelection) : updater;
			const idsSelecionados = Object.keys(next).filter((k) => next[k]);
			if (idsSelecionados.length > 1) {
				const pedidosSelecionados = idsSelecionados
					.map((id) => pedidos.find((p) => p.id === id))
					.filter(Boolean) as PedidoDav[];
				const clienteRef = pedidosSelecionados[0]?.idcliente;
				const clienteDiferente = pedidosSelecionados.some(
					(p) => p.idcliente !== clienteRef,
				);
				if (clienteDiferente) {
					toast.error(
						"Só é possível faturar pedidos do mesmo cliente de uma vez",
					);
					return;
				}
			}
			setRowSelection(next);
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		enableRowSelection: (row) => pedidoPodeFaturarNfe(row.original),
		getRowId: (row) => row.id,
	});

	const pedidosSelecionados = tabela
		.getSelectedRowModel()
		.rows.map((row) => row.original);

	function aplicarFiltros() {
		setFiltrosAplicados({ ...filtros });
		setPage(1);
		setRowSelection({});
	}

	function limparFiltros() {
		setFiltros(filtrosVazios);
		setFiltrosAplicados(filtrosVazios);
		setPage(1);
		setRowSelection({});
	}

	function faturarSelecionados() {
		if (pedidosSelecionados.length === 0) {
			toast.error("Selecione ao menos um pedido");
			return;
		}
		const ids = pedidosSelecionados.map((p) => p.id);
		if (ids.length === 1) {
			router.push(`/nota-fiscal-venda/nova?pedido=${ids[0]}`);
			return;
		}
		router.push(`/nota-fiscal-venda/nova?pedidos=${ids.join(",")}`);
	}

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-muted-foreground">
						Selecione uma empresa para visualizar os pedidos.
					</p>
				</div>
			</PageContainer>
		);
	}

	const comFiltros = filtrosAtivos(filtrosAplicados);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 p-4 md:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-semibold tracking-tight">
								{filtrarOrigemPos ? "Pedidos da maquininha" : "Pedidos"}
							</h1>
							{filtrarOrigemPos && (
								<Badge variant="secondary">Origem POS</Badge>
							)}
						</div>
						<p className="text-sm text-muted-foreground">
							{filtrarOrigemPos
								? "Pedidos (DAV) criados pelo app POS quando a emissão de NFC-e está desabilitada."
								: "Gerencie pedidos (DAV) e fature em NF-e de venda."}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{pedidosSelecionados.length > 0 && (
							<Button onClick={faturarSelecionados}>
								<Send className="h-4 w-4" />
								Faturar NF-e ({pedidosSelecionados.length})
							</Button>
						)}
						<Button onClick={() => criarPedido()} disabled={criandoPedido}>
							<Plus className="h-4 w-4" />
							{criandoPedido ? "Criando..." : "Novo pedido"}
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					<div className="space-y-1.5">
						<Label htmlFor="filtro-data-inicio">Data início</Label>
						<Input
							id="filtro-data-inicio"
							type="date"
							value={filtros.dataInicio}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, dataInicio: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="filtro-data-fim">Data fim</Label>
						<Input
							id="filtro-data-fim"
							type="date"
							value={filtros.dataFim}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, dataFim: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="filtro-cliente">Cliente</Label>
						<Combobox
							options={opcoesClientes}
							value={filtros.idcliente}
							onChange={(value) =>
								setFiltros((f) => ({ ...f, idcliente: value }))
							}
							placeholder="Todos"
							searchPlaceholder="Buscar cliente..."
							emptyMessage="Nenhum cliente encontrado."
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="filtro-status">Status</Label>
						<Select
							value={filtros.statusFiltro || "todos"}
							onValueChange={(value) =>
								setFiltros((f) => ({
									...f,
									statusFiltro: value === "todos" ? "" : value,
								}))
							}
						>
							<SelectTrigger id="filtro-status">
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todos">Todos</SelectItem>
								<SelectItem value="0">Aberto</SelectItem>
								<SelectItem value="1">Fechado</SelectItem>
								<SelectItem value="2">Passou pelo caixa</SelectItem>
								<SelectItem value="3">Cancelado</SelectItem>
								<SelectItem value="faturado">NF-e emitida</SelectItem>
								<SelectItem value="nao_faturado">Sem NF-e</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="filtro-codigo">Código</Label>
						<Input
							id="filtro-codigo"
							type="number"
							inputMode="numeric"
							placeholder="Ex: 123"
							value={filtros.codigo}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, codigo: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="filtro-busca">Busca cliente</Label>
						<Input
							id="filtro-busca"
							placeholder="Nome do cliente"
							value={filtros.busca}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, busca: e.target.value }))
							}
						/>
					</div>
					<div className="flex items-end gap-2 xl:col-span-6">
						<Button onClick={aplicarFiltros}>Filtrar</Button>
						{comFiltros && (
							<Button variant="outline" onClick={limparFiltros}>
								<FilterX className="h-4 w-4" />
								Limpar
							</Button>
						)}
					</div>
				</div>

				{isLoading ? (
					<TableSkeleton columns={7} rows={8}>
						<TableHead className="w-10" />
						<TableHead>Código</TableHead>
						<TableHead>Cliente</TableHead>
						<TableHead>Data</TableHead>
						<TableHead>Valor</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="w-12" />
					</TableSkeleton>
				) : (
					<>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									{tabela.getHeaderGroups().map((headerGroup) => (
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
									{tabela.getRowModel().rows.length > 0 ? (
										tabela.getRowModel().rows.map((row) => (
											<TableRow
												key={row.id}
												data-state={row.getIsSelected() && "selected"}
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
												colSpan={colunas.length}
												className="h-32 text-center"
											>
												<div className="flex flex-col items-center gap-2 text-muted-foreground">
													<IconPlus className="h-8 w-8 opacity-40" />
													<p>
														{comFiltros
															? "Nenhum pedido encontrado para os filtros selecionados."
															: "Nenhum pedido encontrado."}
													</p>
													{!comFiltros && (
														<Button
															variant="outline"
															size="sm"
															onClick={() => criarPedido()}
															disabled={criandoPedido}
														>
															Criar primeiro pedido
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>

						{totalPages > 1 && (
							<div className="flex items-center justify-between gap-2">
								<p className="text-sm text-muted-foreground">
									Página {page} de {totalPages} · {data?.paginacao.total ?? 0}{" "}
									pedido(s)
								</p>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={page <= 1}
										onClick={() => {
											setPage((p) => Math.max(1, p - 1));
											setRowSelection({});
										}}
									>
										Anterior
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={page >= totalPages}
										onClick={() => {
											setPage((p) => p + 1);
											setRowSelection({});
										}}
									>
										Próxima
									</Button>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			<AlertDialog
				open={!!pedidoCancelar}
				onOpenChange={(open) => {
					if (!open) setPedidoCancelar(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
						<AlertDialogDescription>
							O pedido {pedidoCancelar?.codigo ?? ""} será marcado como
							cancelado e não poderá ser faturado. Esta ação não remove o
							registro.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelando}>Voltar</AlertDialogCancel>
						<AlertDialogAction
							disabled={cancelando || !pedidoCancelar}
							onClick={() => {
								if (pedidoCancelar) cancelarPedido(pedidoCancelar);
							}}
						>
							{cancelando ? "Cancelando..." : "Confirmar cancelamento"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageContainer>
	);
}

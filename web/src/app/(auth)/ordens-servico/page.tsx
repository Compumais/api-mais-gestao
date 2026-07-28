"use client";

import {
	IconDotsVertical,
	IconEye,
	IconPencil,
	IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { FilterX, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	DropdownMenu,
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	useExcluirOrdemServico,
	useOrdensServico,
	useTiposOrdemServicoEvento,
} from "@/hooks/use-ordem-servico";
import { entidadesService } from "@/services/entidades.service";
import type { OrdemServico } from "@/services/ordem-servico.service";
import {
	formatarDataOs,
	formatarMoedaOs,
	osBloqueadaEdicao,
	osPodeExcluir,
} from "@/util/ordem-servico-ui";
import { PageContainer } from "../components/page-container";
import { OrdemServicoStatusBadge } from "./components/ordem-servico-status-badge";

type FiltrosState = {
	dataInicio: string;
	dataFim: string;
	idcliente: string;
	idultimotecnico: string;
	status: string;
	codigo: string;
	orcamento: string;
	busca: string;
};

const filtrosVazios: FiltrosState = {
	dataInicio: "",
	dataFim: "",
	idcliente: "",
	idultimotecnico: "",
	status: "",
	codigo: "",
	orcamento: "",
	busca: "",
};

function filtrosAtivos(filtros: FiltrosState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function OrdensServicoPage() {
	const router = useRouter();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const excluir = useExcluirOrdemServico();
	const idBase = useId();
	const idDataInicio = `${idBase}-data-inicio`;
	const idDataFim = `${idBase}-data-fim`;
	const idStatus = `${idBase}-status`;
	const idCodigo = `${idBase}-codigo`;
	const idOrcamento = `${idBase}-orcamento`;
	const idBusca = `${idBase}-busca`;
	const [page, setPage] = useState(1);
	const [filtros, setFiltros] = useState<FiltrosState>(filtrosVazios);
	const [filtrosAplicados, setFiltrosAplicados] =
		useState<FiltrosState>(filtrosVazios);
	const [osParaExcluir, setOsParaExcluir] = useState<OrdemServico | null>(null);
	const limit = 20;

	const { data: tipos = [] } = useTiposOrdemServicoEvento(empresa?.id ?? null);

	const { data: entidadesLista } = useQuery({
		queryKey: ["entidades-os-lista", empresa?.id],
		queryFn: () =>
			entidadesService.listarTodos({
				idempresa: empresa?.id ?? "",
			}),
		enabled: !!empresa?.id,
	});

	const opcoesClientes = useMemo(
		() =>
			(entidadesLista ?? [])
				.filter((item) => item.cliente === 1)
				.map((item) => ({
					value: item.id,
					label:
						item.razaosocial?.trim() ||
						item.nome?.trim() ||
						item.cnpjcpf ||
						item.id,
				})),
		[entidadesLista],
	);

	const opcoesTecnicos = useMemo(
		() =>
			(entidadesLista ?? []).map((item) => ({
				value: item.id,
				label:
					item.razaosocial?.trim() ||
					item.nome?.trim() ||
					item.cnpjcpf ||
					item.id,
			})),
		[entidadesLista],
	);

	const { data, isLoading } = useOrdensServico(
		empresa
			? {
					idempresa: empresa.id,
					page,
					limit,
					dataInicio: filtrosAplicados.dataInicio || undefined,
					dataFim: filtrosAplicados.dataFim || undefined,
					idcliente: filtrosAplicados.idcliente || undefined,
					idultimotecnico: filtrosAplicados.idultimotecnico || undefined,
					status: filtrosAplicados.status
						? Number(filtrosAplicados.status)
						: undefined,
					codigo: filtrosAplicados.codigo
						? Number(filtrosAplicados.codigo)
						: undefined,
					orcamento:
						filtrosAplicados.orcamento !== ""
							? Number(filtrosAplicados.orcamento)
							: undefined,
					busca: filtrosAplicados.busca || undefined,
				}
			: null,
	);

	const ordens = data?.data ?? [];
	const totalPages = data?.paginacao.totalPages ?? 1;

	const confirmarExclusao = useCallback(async () => {
		if (!empresa || !osParaExcluir) return;
		try {
			await excluir.mutateAsync({
				id: osParaExcluir.id,
				idempresa: empresa.id,
			});
			toast.success("Ordem de serviço excluída");
			setOsParaExcluir(null);
		} catch (erro) {
			toast.error("Erro ao excluir", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		}
	}, [empresa, excluir, osParaExcluir]);

	const colunas = useMemo<ColumnDef<OrdemServico>[]>(
		() => [
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
					formatarDataOs(row.original.dataos ?? row.original.data),
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => (
					<OrdemServicoStatusBadge status={row.original.status} tipos={tipos} />
				),
			},
			{
				id: "valor",
				header: "Valor",
				cell: ({ row }) => formatarMoedaOs(row.original.valor),
			},
			{
				id: "orcamento",
				header: "Orçamento",
				cell: ({ row }) => (row.original.orcamento === 1 ? "Sim" : "Não"),
			},
			{
				id: "acoes",
				header: "Ações",
				cell: ({ row }) => {
					const os = row.original;
					const podeEditar = !osBloqueadaEdicao(os);
					const podeExcluir = osPodeExcluir(os);

					return (
						<div className="flex justify-end">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										aria-label={`Ações da OS ${os.codigo ?? ""}`}
									>
										<IconDotsVertical className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => router.push(`/ordens-servico/${os.id}`)}
									>
										<IconEye className="size-4" />
										Visualizar
									</DropdownMenuItem>
									{podeEditar && (
										<DropdownMenuItem
											onClick={() => router.push(`/ordens-servico/${os.id}`)}
										>
											<IconPencil className="size-4" />
											Editar
										</DropdownMenuItem>
									)}
									{podeExcluir && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												variant="destructive"
												onClick={() => setOsParaExcluir(os)}
											>
												<IconTrash className="size-4" />
												Excluir
											</DropdownMenuItem>
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				},
			},
		],
		[router, tipos],
	);

	const tabela = useReactTable({
		data: ordens,
		columns: colunas,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
	});

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-muted-foreground">
						Selecione uma empresa para visualizar as ordens de serviço.
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
						<h1 className="text-2xl font-semibold tracking-tight">
							Ordens de serviço
						</h1>
						<p className="text-sm text-muted-foreground">
							Gerencie ordens de serviço, itens, eventos e faturamento.
						</p>
					</div>
					<Button asChild>
						<Link href="/ordens-servico/nova">
							<Plus className="h-4 w-4" />
							Nova OS
						</Link>
					</Button>
				</div>

				<div className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					<div className="space-y-1.5">
						<Label htmlFor={idDataInicio}>Data início</Label>
						<Input
							id={idDataInicio}
							type="date"
							value={filtros.dataInicio}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, dataInicio: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idDataFim}>Data fim</Label>
						<Input
							id={idDataFim}
							type="date"
							value={filtros.dataFim}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, dataFim: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Cliente</Label>
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
						<Label>Técnico</Label>
						<Combobox
							options={opcoesTecnicos}
							value={filtros.idultimotecnico}
							onChange={(value) =>
								setFiltros((f) => ({ ...f, idultimotecnico: value }))
							}
							placeholder="Todos"
							searchPlaceholder="Buscar técnico..."
							emptyMessage="Nenhum técnico encontrado."
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idStatus}>Status</Label>
						<Select
							value={filtros.status || "todos"}
							onValueChange={(value) =>
								setFiltros((f) => ({
									...f,
									status: value === "todos" ? "" : value,
								}))
							}
						>
							<SelectTrigger className="w-full" id={idStatus}>
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todos">Todos</SelectItem>
								{tipos
									.filter((tipo) => tipo.ativo === 1)
									.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
									.map((tipo) => (
										<SelectItem key={tipo.id} value={String(tipo.status)}>
											{tipo.descricao}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idCodigo}>Código</Label>
						<Input
							id={idCodigo}
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
						<Label htmlFor={idOrcamento}>Orçamento</Label>
						<Select
							value={filtros.orcamento || "todos"}
							onValueChange={(value) =>
								setFiltros((f) => ({
									...f,
									orcamento: value === "todos" ? "" : value,
								}))
							}
						>
							<SelectTrigger className="w-full" id={idOrcamento}>
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todos">Todos</SelectItem>
								<SelectItem value="1">Somente orçamentos</SelectItem>
								<SelectItem value="0">Somente OS</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={idBusca}>Busca cliente</Label>
						<Input
							id={idBusca}
							placeholder="Nome do cliente"
							value={filtros.busca}
							onChange={(e) =>
								setFiltros((f) => ({ ...f, busca: e.target.value }))
							}
						/>
					</div>
					<div className="flex justify-end items-end gap-2 xl:col-span-4">
						<Button
							onClick={() => {
								setFiltrosAplicados({ ...filtros });
								setPage(1);
							}}
						>
							Filtrar
						</Button>
						{comFiltros && (
							<Button
								variant="outline"
								onClick={() => {
									setFiltros(filtrosVazios);
									setFiltrosAplicados(filtrosVazios);
									setPage(1);
								}}
							>
								<FilterX className="h-4 w-4" />
								Limpar
							</Button>
						)}
					</div>
				</div>

				{isLoading ? (
					<TableSkeleton columns={7} rows={8}>
						<TableHead>Código</TableHead>
						<TableHead>Cliente</TableHead>
						<TableHead>Data</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Valor</TableHead>
						<TableHead>Orçamento</TableHead>
						<TableHead className="w-12">Ações</TableHead>
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
												colSpan={colunas.length}
												className="h-32 text-center text-muted-foreground"
											>
												{comFiltros
													? "Nenhuma ordem encontrada para os filtros selecionados."
													: "Nenhuma ordem de serviço encontrada."}
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
									registro(s)
								</p>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={page <= 1}
										onClick={() => setPage((p) => Math.max(1, p - 1))}
									>
										Anterior
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={page >= totalPages}
										onClick={() => setPage((p) => p + 1)}
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
				open={!!osParaExcluir}
				onOpenChange={(open) => {
					if (!open) setOsParaExcluir(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir ordem de serviço?</AlertDialogTitle>
						<AlertDialogDescription>
							Confirma a exclusão da OS {osParaExcluir?.codigo ?? ""}? A
							exclusão só é permitida sem faturamentos e com todos os itens
							cancelados. Esta ação não poderá ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={excluir.isPending}>
							Voltar
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={excluir.isPending}
							onClick={() => void confirmarExclusao()}
						>
							{excluir.isPending ? "Excluindo..." : "Confirmar exclusão"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageContainer>
	);
}

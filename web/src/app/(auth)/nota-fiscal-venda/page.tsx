"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import Link from "next/link";
import { Plus, RotateCcw, Ban, FileX2 } from "lucide-react";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import { useNfeConfiguracao } from "@/hooks/use-nfe-configuracao";
import { NFE_STATUS, NFE_STATUS_LABELS, NFE_AMBIENTE_LABELS } from "@/constants/nfe-status";
import { listarNfesEmitidas, cancelarNfe, inutilizarNfe, type NotaFiscalEmitida } from "@/services/nfe-emissao.service";
import { obterCodigoRejeicaoNota, obterMotivoRejeicaoNota } from "@/util/nfe-rejeicao-util";
import {
	notaPodeSerCancelada,
	notaPodeSerInutilizada,
} from "@/util/validar-eventos-nfe";
import { AvisoAmbienteNfe } from "./components/aviso-ambiente-nfe";
import { StatusNfeBadge } from "./components/status-nfe-badge";
import { ModalEventoNfe } from "./components/modal-evento-nfe";
import { PageContainer } from "../components/page-container";
import { toast } from "sonner";

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	const num = parseFloat(value);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
};

const formatDateTime = (date: string | null | undefined) => {
	if (!date) return "-";
	try {
		return new Date(date).toLocaleString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return date;
	}
};

const obterDataExibicao = (nota: NotaFiscalEmitida) =>
	nota.emissao ?? nota.datahoraemissao ?? nota.datainclusao;

const createColumns = (params: {
	onCancelar: (nota: NotaFiscalEmitida) => void;
	onInutilizar: (nota: NotaFiscalEmitida) => void;
}): ColumnDef<NotaFiscalEmitida>[] => [
	{
		accessorKey: "numeronotafiscal",
		header: "Nº",
		cell: ({ row }) => (
			<div className="font-medium">
				{row.original.serie}-{row.getValue("numeronotafiscal") || "—"}
			</div>
		),
	},
	{
		accessorKey: "razaosocial",
		header: "Destinatário",
		cell: ({ row }) => (
			<div className="max-w-[200px] truncate">
				{row.getValue("razaosocial") || "Consumidor Final"}
			</div>
		),
	},
	{
		id: "dataEmissao",
		header: "Data",
		cell: ({ row }) => (
			<div className="whitespace-nowrap text-sm">
				{formatDateTime(obterDataExibicao(row.original))}
			</div>
		),
	},
	{
		accessorKey: "valortotalnota",
		header: () => <div className="text-right">Total</div>,
		cell: ({ row }) => (
			<div className="text-right font-medium">
				{formatCurrency(row.getValue("valortotalnota"))}
			</div>
		),
	},
	{
		accessorKey: "tipoambientenfe",
		header: "Ambiente",
		cell: ({ row }) => {
			const amb = row.getValue("tipoambientenfe") as number | null;
			if (!amb) return <span className="text-muted-foreground text-sm">—</span>;
			return (
				<span
					className={
						amb === 2
							? "text-yellow-700 text-xs font-medium"
							: "text-red-700 text-xs font-medium"
					}
				>
					{NFE_AMBIENTE_LABELS[amb] ?? amb}
				</span>
			);
		},
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const nota = row.original;
			const rejeitada = nota.status === NFE_STATUS.REJEITADA;
			const motivo = obterMotivoRejeicaoNota(nota);
			const codigo = obterCodigoRejeicaoNota(nota);

			return (
				<div className="flex max-w-[280px] flex-col gap-1">
					<StatusNfeBadge
						status={nota.status}
						cStat={codigo}
						xMotivo={motivo}
						size="sm"
					/>
					{rejeitada && (codigo || motivo) && (
						<p
							className="text-xs leading-snug text-red-700 line-clamp-3"
							title={[codigo, motivo].filter(Boolean).join(" — ")}
						>
							{codigo ? `Cód. ${codigo}` : "Rejeição"}
							{codigo && motivo ? ": " : ""}
							{motivo ?? ""}
						</p>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: "chavenfe",
		header: "Chave",
		cell: ({ row }) => {
			const chave = row.getValue("chavenfe") as string | null;
			if (!chave) return <span className="text-muted-foreground text-sm">—</span>;
			return (
				<span
					className="font-mono text-xs text-muted-foreground"
					title={chave}
				>
					{chave.replace(/(\d{4})(?=\d)/g, "$1 ").trim()}
				</span>
			);
		},
	},
	{
		id: "acoes",
		header: "",
		cell: ({ row }) => {
			const nota = row.original;
			const podeTransmitir =
				nota.status === NFE_STATUS.PENDENTE ||
				nota.status === NFE_STATUS.REJEITADA;
			const podeDevolver =
				nota.status === NFE_STATUS.AUTORIZADA && !!nota.chavenfe;
			const podeCancelar = notaPodeSerCancelada(nota).permitido;
			const podeInutilizar = notaPodeSerInutilizada(nota).permitido;

			return (
				<div className="flex items-center gap-1">
					{podeCancelar && (
						<Button
							size="sm"
							variant="outline"
							className="h-7 px-2 text-xs text-destructive border-destructive/30"
							onClick={(e) => {
								e.stopPropagation();
								params.onCancelar(nota);
							}}
						>
							<Ban className="mr-1 size-3" />
							Cancelar
						</Button>
					)}
					{podeInutilizar && (
						<Button
							size="sm"
							variant="outline"
							className="h-7 px-2 text-xs"
							onClick={(e) => {
								e.stopPropagation();
								params.onInutilizar(nota);
							}}
						>
							<FileX2 className="mr-1 size-3" />
							Inutilizar
						</Button>
					)}
					{podeDevolver && (
						<Link href={`/nota-fiscal-venda/nova?devolverVenda=${nota.id}`}>
							<Button size="sm" variant="outline" className="h-7 px-2 text-xs">
								<RotateCcw className="mr-1 size-3" />
								Devolver
							</Button>
						</Link>
					)}
					{podeTransmitir && (
						<Link href={`/nota-fiscal-venda/${nota.id}`}>
							<Button size="sm" className="h-7 px-2 text-xs">
								Transmitir
							</Button>
						</Link>
					)}
					<Link href={`/nota-fiscal-venda/${nota.id}`}>
						<Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
							Ver
						</Button>
					</Link>
				</div>
			);
		},
	},
];

export default function NotaFiscalVendaPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { nfeConfiguracao } = useNfeConfiguracao(empresa?.id);
	const queryClient = useQueryClient();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [statusFiltro, setStatusFiltro] = useState<string>("todos");
	const [eventoModal, setEventoModal] = useState<{
		tipo: "cancelar" | "inutilizar";
		nota: NotaFiscalEmitida;
	} | null>(null);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	});

	const { data, isLoading } = useQuery({
		queryKey: [
			"nfe-emitidas",
			empresa?.id,
			statusFiltro,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return listarNfesEmitidas({
				idempresa: empresa.id,
				status:
					statusFiltro !== "todos" ? Number(statusFiltro) : undefined,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
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

	const columns = createColumns({
		onCancelar: (nota) => setEventoModal({ tipo: "cancelar", nota }),
		onInutilizar: (nota) => setEventoModal({ tipo: "inutilizar", nota }),
	});

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao?.totalPages ?? 0,
	});

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Notas Fiscais de Venda (NF-e)</h1>
					{empresa && (
						<Link href="/nota-fiscal-venda/nova">
							<Button className="gap-2">
								<Plus className="h-4 w-4" />
								Emitir NF-e
							</Button>
						</Link>
					)}
				</div>

				{nfeConfiguracao && (
					<div className="px-4">
						<AvisoAmbienteNfe ambiente={nfeConfiguracao.ambiente} />
					</div>
				)}

				{empresa && (
					<div className="flex items-center gap-3 px-4">
						<span className="text-sm text-muted-foreground">Status:</span>
						<Select value={statusFiltro} onValueChange={setStatusFiltro}>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todos">Todos</SelectItem>
								{Object.entries(NFE_STATUS_LABELS).map(([codigo, label]) => (
									<SelectItem key={codigo} value={codigo}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as notas fiscais
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10} columns={8}>
							<TableCell>Nº</TableCell>
							<TableCell>Destinatário</TableCell>
							<TableCell>Data</TableCell>
							<TableCell className="text-right">Total</TableCell>
							<TableCell>Ambiente</TableCell>
							<TableCell>Status</TableCell>
							<TableCell>Chave</TableCell>
							<TableCell />
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
												colSpan={columns.length}
												className="h-24 text-center text-muted-foreground"
											>
												Nenhuma NF-e emitida.{" "}
												<Link
													href="/nota-fiscal-venda/nova"
													className="text-primary underline"
												>
													Emitir agora
												</Link>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
							{data && (data.paginacao?.totalPages ?? 0) > 1 && (
								<div className="flex items-center justify-between px-4 py-4 border-t">
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

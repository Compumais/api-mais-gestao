"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
	NFE_AMBIENTE_LABELS,
	NFE_STATUS_LABELS,
} from "@/constants/nfe-status";
import { useEmpresa } from "@/hooks/use-empresa";
import { formatCurrency } from "@/lib/gourmet-utils";
import { nfceService, type NfcePendente } from "@/services/nfce.service";
import { PageContainer } from "../components/page-container";

function formatarValor(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "R$ 0,00";
	return formatCurrency(n);
}

function obterMotivo(nota: NfcePendente) {
	if (nota.mensagemtransmissaonfe?.trim()) {
		return nota.mensagemtransmissaonfe.trim();
	}
	if (nota.codigostatusprotocolonfe != null) {
		return `cStat ${nota.codigostatusprotocolonfe}`;
	}
	return "—";
}

export default function NfcePendentesPage() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const [reemitindoId, setReemitindoId] = useState<string | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["nfce-pendentes", idempresa, page],
		queryFn: () =>
			nfceService.listarPendentes({
				idempresa,
				page,
				limit: 20,
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
			queryClient.invalidateQueries({ queryKey: ["nfce-pendentes", idempresa] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao reemitir NFC-e");
		},
		onSettled: () => {
			setReemitindoId(null);
		},
	});

	const columns = useMemo<ColumnDef<NfcePendente>[]>(
		() => [
			{
				header: "Data",
				accessorKey: "datainclusao",
				cell: ({ row }) =>
					row.original.datainclusao
						? dayjs(row.original.datainclusao).format("DD/MM/YYYY HH:mm")
						: "—",
			},
			{
				header: "Número",
				cell: ({ row }) => {
					const { numeronotafiscal, serie } = row.original;
					if (!numeronotafiscal) return "—";
					return serie ? `${numeronotafiscal}/${serie}` : numeronotafiscal;
				},
			},
			{
				header: "Venda PDV",
				accessorKey: "idvenda",
				cell: ({ row }) =>
					row.original.idvenda
						? row.original.idvenda.slice(0, 8)
						: "—",
			},
			{
				header: "Valor",
				accessorKey: "valortotalnota",
				cell: ({ row }) => formatarValor(row.original.valortotalnota),
			},
			{
				header: "Status",
				accessorKey: "status",
				cell: ({ row }) => {
					const status = row.original.status;
					const label =
						status != null ? NFE_STATUS_LABELS[status] ?? `Status ${status}` : "—";
					return <Badge variant="outline">{label}</Badge>;
				},
			},
			{
				header: "Ambiente",
				accessorKey: "tipoambientenfe",
				cell: ({ row }) => {
					const ambiente = row.original.tipoambientenfe;
					if (ambiente == null) return "—";
					return NFE_AMBIENTE_LABELS[ambiente] ?? ambiente;
				},
			},
			{
				header: "Motivo SEFAZ",
				cell: ({ row }) => (
					<span className="line-clamp-2 max-w-xs text-sm" title={obterMotivo(row.original)}>
						{obterMotivo(row.original)}
					</span>
				),
			},
			{
				header: "Chave",
				accessorKey: "chavenfe",
				cell: ({ row }) =>
					row.original.chavenfe ? (
						<span className="font-mono text-xs">
							{row.original.chavenfe.slice(-8)}
						</span>
					) : (
						"—"
					),
			},
			{
				id: "acoes",
				header: "",
				cell: ({ row }) => (
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={reemitindoId === row.original.idnotafiscal}
						onClick={() => {
							setReemitindoId(row.original.idnotafiscal);
							reemitirMutation.mutate(row.original.idnotafiscal);
						}}
					>
						<IconRefresh className="size-4" />
						{reemitindoId === row.original.idnotafiscal
							? "Enviando..."
							: "Retransmitir"}
					</Button>
				),
			},
		],
		[reemitindoId, reemitirMutation],
	);

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const totalPages = data?.paginacao.totalPages ?? 1;

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
				<div className="px-4">
					<h1 className="text-2xl font-bold">NFC-e pendentes</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Notas do PDV com falha de transmissão ou rejeição da SEFAZ
					</p>
				</div>

				<div className="px-4">
			{isLoading ? (
				<TableSkeleton columns={9} rows={8}>
					<TableHead>Data</TableHead>
					<TableHead>Número</TableHead>
					<TableHead>Venda PDV</TableHead>
					<TableHead>Valor</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Ambiente</TableHead>
					<TableHead>Motivo SEFAZ</TableHead>
					<TableHead>Chave</TableHead>
					<TableHead className="w-12" />
				</TableSkeleton>
			) : (
				<>
					<div className="rounded-md border">
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
											colSpan={columns.length}
											className="h-24 text-center text-muted-foreground"
										>
											Nenhuma NFC-e pendente encontrada.
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
					</div>

					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								Anterior
							</Button>
							<span className="text-sm text-muted-foreground">
								Página {page} de {totalPages}
							</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => p + 1)}
							>
								Próxima
							</Button>
						</div>
					)}
				</>
			)}
				</div>
			</div>
		</PageContainer>
	);
}

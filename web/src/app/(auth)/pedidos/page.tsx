"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { IconPlus } from "@tabler/icons-react";
import { ExternalLink, Plus } from "lucide-react";
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
import { useEmpresa } from "@/hooks/use-empresa";
import { DAV_STATUS_LABELS } from "@/constants/dav-status";
import { davService, type PedidoDav } from "@/services/dav.service";
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

const colunas: ColumnDef<PedidoDav>[] = [
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
			return (
				<Badge variant={faturado ? "default" : "secondary"}>{label}</Badge>
			);
		},
	},
	{
		id: "acoes",
		header: "",
		cell: ({ row }) => (
			<div className="flex justify-end gap-2">
				{row.original.idnotafiscal && (
					<Button variant="ghost" size="sm" asChild>
						<Link href={`/nota-fiscal-venda/${row.original.idnotafiscal}`}>
							<ExternalLink className="h-4 w-4" />
							NF-e
						</Link>
					</Button>
				)}
				<Button variant="outline" size="sm" asChild>
					<Link href={`/pedidos/${row.original.id}`}>Abrir</Link>
				</Button>
			</div>
		),
	},
];

export default function PedidosPage() {
	const router = useRouter();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [sorting, setSorting] = useState<SortingState>([]);

	const { data, isLoading } = useQuery({
		queryKey: ["pedidos", empresa?.id],
		queryFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return davService.listar({
				idempresa: empresa.id,
				page: 1,
				limit: 50,
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

	const tabela = useReactTable({
		data: data?.data ?? [],
		columns: colunas,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

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

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 p-4 md:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
						<p className="text-sm text-muted-foreground">
							Gerencie pedidos (DAV) e fature em NF-e de venda.
						</p>
					</div>
					<Button onClick={() => criarPedido()} disabled={criandoPedido}>
						<Plus className="h-4 w-4" />
						{criandoPedido ? "Criando..." : "Novo pedido"}
					</Button>
				</div>

				{isLoading ? (
					<TableSkeleton columns={6} rows={8} />
				) : (
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
										<TableCell colSpan={colunas.length} className="h-32 text-center">
											<div className="flex flex-col items-center gap-2 text-muted-foreground">
												<IconPlus className="h-8 w-8 opacity-40" />
												<p>Nenhum pedido encontrado.</p>
												<Button
													variant="outline"
													size="sm"
													onClick={() => criarPedido()}
													disabled={criandoPedido}
												>
													Criar primeiro pedido
												</Button>
											</div>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</PageContainer>
	);
}

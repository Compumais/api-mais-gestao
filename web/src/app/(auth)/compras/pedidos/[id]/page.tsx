"use client";

import { IconPrinter } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
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
	formatarMoeda,
	formatarQuantidade,
	labelProdutoCotacao,
	STATUS_PEDIDO_COMPRA,
} from "@/constants/compras-constants";
import { pedidosCompraService } from "@/services/pedidos-compra.service";

export default function DetalhePedidoCompraPage() {
	const params = useParams<{ id: string }>();
	const queryClient = useQueryClient();
	const id = params.id;

	const { data, isLoading } = useQuery({
		queryKey: ["pedido-compra", id],
		queryFn: () => pedidosCompraService.buscar(id),
	});

	const { mutate: cancelar, isPending } = useMutation({
		mutationFn: () => pedidosCompraService.cancelar(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pedido-compra", id] });
			queryClient.invalidateQueries({ queryKey: ["pedidos-compra"] });
			toast.success("Pedido cancelado");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	if (isLoading) {
		return (
			<PageContainer>
				<div className="flex justify-center py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			</PageContainer>
		);
	}

	if (!data) {
		return (
			<PageContainer>
				<p className="p-8 text-center">Pedido não encontrado.</p>
			</PageContainer>
		);
	}

	const status = STATUS_PEDIDO_COMPRA[data.status];

	return (
		<PageContainer>
			<div className="print-pedido flex flex-col gap-4 py-4 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-2 px-4 print:hidden">
					<h1 className="text-2xl font-bold">Pedido de compra #{data.codigo}</h1>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => window.print()}>
							<IconPrinter className="size-4" />
							Imprimir
						</Button>
						{data.status === "A" && (
							<Button
								variant="destructive"
								onClick={() => cancelar()}
								disabled={isPending}
							>
								Cancelar pedido
							</Button>
						)}
					</div>
				</div>

				<div className="mx-4 space-y-4 rounded-lg border bg-card p-4">
					<div className="flex items-center gap-2">
						<h2 className="hidden text-xl font-bold print:block">
							Pedido de compra #{data.codigo}
						</h2>
						<Badge variant={status?.variant ?? "outline"}>
							{status?.label ?? data.status}
						</Badge>
					</div>
					<div className="grid gap-2 text-sm md:grid-cols-2">
						<p>
							<strong>Fornecedor:</strong> {data.fornecedornome}
						</p>
						<p>
							<strong>Telefone:</strong> {data.fornecedortelefone}
						</p>
						<p>
							<strong>Cotação:</strong>{" "}
							{data.cotacaocodigo
								? `#${data.cotacaocodigo} ${data.cotacaotitulo ?? ""}`
								: "—"}
						</p>
						<p>
							<strong>Total:</strong> {formatarMoeda(data.valortotal)}
						</p>
					</div>
				</div>

				<div className="mx-4 rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Produto</TableHead>
								<TableHead>Qtd</TableHead>
								<TableHead className="text-right">Preço unit.</TableHead>
								<TableHead className="text-right">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(data.itens ?? []).map((item) => (
								<TableRow key={item.id}>
									<TableCell>{labelProdutoCotacao(item)}</TableCell>
									<TableCell>{formatarQuantidade(item.quantidade)}</TableCell>
									<TableCell className="text-right">
										{formatarMoeda(item.precounitario)}
									</TableCell>
									<TableCell className="text-right">
										{formatarMoeda(item.total)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
			<style>{`
				@media print {
					aside, header, [data-sidebar] { display: none !important; }
				}
			`}</style>
		</PageContainer>
	);
}

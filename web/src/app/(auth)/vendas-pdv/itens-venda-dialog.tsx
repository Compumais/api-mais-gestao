"use client";

import { IconReceipt } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatDateTimeBrasilia } from "@/lib/date";
import { formatCurrency } from "@/lib/gourmet-utils";
import type { VendaPdvGourmet } from "@/services/venda-pdv-gourmet.service";
import { vendaPdvItemService } from "@/services/venda-pdv-item.service";
import { calcularTotal, nomeOperador, tipoVenda } from "./vendas-pdv-helpers";

export function ItensVendaDialog({
	venda,
	idempresa,
	open,
	onOpenChange,
	produtosPorId,
	usuariosPorId,
}: {
	venda: VendaPdvGourmet | null;
	idempresa: string;
	open: boolean;
	onOpenChange: (v: boolean) => void;
	produtosPorId: Record<string, string>;
	usuariosPorId: Record<string, string>;
}) {
	const { data, isLoading } = useQuery({
		queryKey: ["vendas-pdv-item", venda?.id, idempresa],
		queryFn: async () => {
			if (!venda) throw new Error("Venda não selecionada");
			return vendaPdvItemService.listar({
				idempresa,
				idvenda: venda.id,
				limit: 100,
			});
		},
		enabled: !!venda && open,
	});

	const itens = data?.data ?? [];
	const total = calcularTotal(itens);
	const operador = venda ? nomeOperador(venda, usuariosPorId) : "—";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<IconReceipt className="size-5" aria-hidden="true" />
						Venda Nº {venda?.numeropdv}
					</DialogTitle>
					<DialogDescription>
						{venda && formatDateTimeBrasilia(venda.datacriacao)} —{" "}
						{venda && tipoVenda(venda)}
						{operador !== "—" ? (
							<>
								{" "}
								• Operador: <strong>{operador}</strong>
							</>
						) : null}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i.toString()}
								className="h-10 animate-pulse rounded bg-muted"
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
								<span className="text-base text-primary">
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

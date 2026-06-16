"use client";

import { IconMinus, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	calcularTotalContaMesaItens,
	formatCurrency,
	parseValor,
} from "@/lib/gourmet-utils";
import type { ContaMesaItem } from "@/services/conta-mesa-item.service";

interface CarrinhoComandaProps {
	itens: ContaMesaItem[];
	isLoading: boolean;
	onAtualizarQuantidade: (item: ContaMesaItem, novaQuantidade: number) => void;
	onRemover: (itemId: string) => void;
	onFecharConta: () => void;
	onCancelarMesa: () => void;
	isUpdating?: boolean;
	numeromesa?: number;
}

export function CarrinhoComanda({
	itens,
	isLoading,
	onAtualizarQuantidade,
	onRemover,
	onFecharConta,
	onCancelarMesa,
	isUpdating,
	numeromesa,
}: CarrinhoComandaProps) {
	const subtotal = calcularTotalContaMesaItens(itens);

	return (
		<div className="flex h-full flex-col border-l bg-muted/20">
			<div className="border-b p-4">
				<h2 className="text-lg font-semibold">
					{numeromesa ? `Comanda — Mesa ${numeromesa}` : "Comanda"}
				</h2>
				<p className="text-sm text-muted-foreground">
					{itens.length} {itens.length === 1 ? "item" : "itens"}
				</p>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{isLoading && (
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				)}
				{!isLoading && itens.length === 0 && (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Nenhum item na comanda. Selecione produtos ao lado.
					</p>
				)}
				{!isLoading &&
					itens.map((item) => {
						const qty = parseValor(item.quantidade);
						const totalItem = qty * parseValor(item.precounitario);
						return (
							<div
								key={item.id}
								className="mb-3 rounded-lg border bg-background p-3"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium">{item.nomeproduto}</p>
										<p className="text-sm text-muted-foreground">
											{formatCurrency(item.precounitario)} un.
										</p>
										{item.observacao && (
											<p className="mt-1 text-xs text-muted-foreground">
												{item.observacao}
											</p>
										)}
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => onRemover(item.id)}
										disabled={isUpdating}
										aria-label="Remover item"
									>
										<IconTrash className="size-4 text-destructive" />
									</Button>
								</div>
								<div className="mt-2 flex items-center justify-between">
									<div className="flex items-center gap-1">
										<Button
											variant="outline"
											size="icon-sm"
											onClick={() =>
												onAtualizarQuantidade(item, Math.max(0.001, qty - 1))
											}
											disabled={isUpdating || qty <= 1}
										>
											<IconMinus className="size-3" />
										</Button>
										<span className="w-10 text-center text-sm font-medium">
											{qty}
										</span>
										<Button
											variant="outline"
											size="icon-sm"
											onClick={() => onAtualizarQuantidade(item, qty + 1)}
											disabled={isUpdating}
										>
											<IconPlus className="size-3" />
										</Button>
									</div>
									<span className="font-semibold">
										{formatCurrency(totalItem)}
									</span>
								</div>
							</div>
						);
					})}
			</div>

			<div className="border-t p-4">
				<div className="mb-4 flex items-center justify-between text-lg font-bold">
					<span>Subtotal</span>
					<span className="text-primary">{formatCurrency(subtotal)}</span>
				</div>
				<Separator className="mb-4" />
				<div className="flex flex-col gap-2">
					<Button
						size="lg"
						onClick={onFecharConta}
						disabled={isUpdating || itens.length === 0}
					>
						Fechar conta
					</Button>
					<Button
						variant="outline"
						onClick={onCancelarMesa}
						disabled={isUpdating}
					>
						Cancelar mesa
					</Button>
				</div>
			</div>
		</div>
	);
}

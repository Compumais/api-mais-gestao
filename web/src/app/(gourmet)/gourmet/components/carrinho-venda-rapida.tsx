"use client";

import { IconMinus, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	calcularSubtotalItens,
	formatCurrency,
	parseValor,
	type CarrinhoLocalItem,
} from "@/lib/gourmet-utils";

interface CarrinhoVendaRapidaProps {
	itens: CarrinhoLocalItem[];
	onAtualizarQuantidade: (index: number, novaQuantidade: number) => void;
	onRemover: (index: number) => void;
	onFinalizar: () => void;
}

export function CarrinhoVendaRapida({
	itens,
	onAtualizarQuantidade,
	onRemover,
	onFinalizar,
}: CarrinhoVendaRapidaProps) {
	const subtotal = calcularSubtotalItens(itens);

	return (
		<div className="flex h-full flex-col border-l bg-muted/20">
			<div className="border-b p-4">
				<h2 className="text-lg font-semibold">Venda rápida</h2>
				<p className="text-sm text-muted-foreground">
					{itens.length} {itens.length === 1 ? "item" : "itens"}
				</p>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{itens.length === 0 && (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Nenhum item no carrinho. Selecione produtos ao lado.
					</p>
				)}
				{itens.map((item, index) => {
					const qty = parseValor(item.quantidade);
					const totalItem = qty * parseValor(item.precounitario);
					return (
						<div
							key={`${item.idproduto}-${index}`}
							className="mb-3 rounded-lg border bg-background p-3"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">{item.nomeproduto}</p>
									<p className="text-sm text-muted-foreground">
										{formatCurrency(item.precounitario)} un.
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => onRemover(index)}
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
											onAtualizarQuantidade(
												index,
												Math.max(0.001, qty - 1),
											)
										}
										disabled={qty <= 1}
									>
										<IconMinus className="size-3" />
									</Button>
									<span className="w-10 text-center text-sm font-medium">
										{qty}
									</span>
									<Button
										variant="outline"
										size="icon-sm"
										onClick={() => onAtualizarQuantidade(index, qty + 1)}
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
				<Button
					size="lg"
					className="w-full"
					onClick={onFinalizar}
					disabled={itens.length === 0}
				>
					Finalizar venda
				</Button>
			</div>
		</div>
	);
}

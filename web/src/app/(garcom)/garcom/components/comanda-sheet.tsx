"use client";

import { IconMinus, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
	calcularTotalContaMesaItens,
	formatCurrency,
	parseValor,
} from "@/lib/gourmet-utils";
import type { ContaMesaItem } from "@/services/conta-mesa-item.service";

interface ComandaSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itens: ContaMesaItem[];
	isLoading: boolean;
	numeromesa?: number;
	onAtualizarQuantidade: (item: ContaMesaItem, novaQuantidade: number) => void;
	onRemover: (itemId: string) => void;
	onFecharMesa?: () => void;
	isUpdating?: boolean;
	isFechando?: boolean;
}

export function ComandaSheet({
	open,
	onOpenChange,
	itens,
	isLoading,
	numeromesa,
	onAtualizarQuantidade,
	onRemover,
	onFecharMesa,
	isUpdating,
	isFechando,
}: ComandaSheetProps) {
	const subtotal = calcularTotalContaMesaItens(itens);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="max-h-[85vh] rounded-t-xl px-0 pb-6"
			>
				<SheetHeader className="border-b px-4 pb-3 text-left">
					<SheetTitle>
						{numeromesa ? `Comanda — ${numeromesa}` : "Comanda"}
					</SheetTitle>
					<SheetDescription>
						{itens.length} {itens.length === 1 ? "item" : "itens"}
					</SheetDescription>
				</SheetHeader>

				<div className="max-h-[50vh] overflow-y-auto px-4 py-3">
					{isLoading && (
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i.toString()} className="h-16 w-full" />
							))}
						</div>
					)}

					{!isLoading && itens.length === 0 && (
						<p className="py-8 text-center text-sm text-muted-foreground">
							Nenhum item na comanda. Toque nos produtos para adicionar.
						</p>
					)}

					{!isLoading &&
						itens.map((item) => {
							const qty = parseValor(item.quantidade);
							const totalItem = qty * parseValor(item.precounitario);

							return (
								<div
									key={item.id}
									className="mb-3 rounded-lg border bg-muted/30 p-3"
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
												className="h-9 w-9"
												onClick={() =>
													onAtualizarQuantidade(
														item,
														Math.max(0.001, qty - 1),
													)
												}
												disabled={isUpdating || qty <= 1}
											>
												<IconMinus className="size-4" />
											</Button>
											<span className="w-10 text-center text-sm font-semibold">
												{qty}
											</span>
											<Button
												variant="outline"
												size="icon-sm"
												className="h-9 w-9"
												onClick={() =>
													onAtualizarQuantidade(item, qty + 1)
												}
												disabled={isUpdating}
											>
												<IconPlus className="size-4" />
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

				<div className="border-t px-4 pt-4">
					<div className="flex items-center justify-between text-lg font-bold">
						<span>Subtotal</span>
						<span className="text-primary">{formatCurrency(subtotal)}</span>
					</div>
					{itens.length > 0 && onFecharMesa && (
						<>
							<Separator className="my-3" />
							<Button
								type="button"
								size="lg"
								className="h-12 w-full text-base"
								onClick={() => {
									onOpenChange(false);
									onFecharMesa();
								}}
								disabled={isUpdating || isFechando}
							>
								{isFechando ? "Fechando mesa..." : "Fechar mesa"}
							</Button>
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

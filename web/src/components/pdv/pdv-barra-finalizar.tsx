"use client";

import { IconShoppingCart, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/gourmet-utils";

interface PdvBarraFinalizarProps {
	total: number;
	qtdItens: number;
	onLimpar: () => void;
	onFinalizar: () => void;
	desabilitado?: boolean;
}

export function PdvBarraFinalizar({
	total,
	qtdItens,
	onLimpar,
	onFinalizar,
	desabilitado,
}: PdvBarraFinalizarProps) {
	return (
		<div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:relative lg:z-auto">
			<div className="flex flex-wrap items-center gap-3 p-3 sm:px-4">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						<IconShoppingCart className="size-5" />
					</div>
					<div className="min-w-0">
						<p className="text-xs text-muted-foreground">
							{qtdItens} {qtdItens === 1 ? "item" : "itens"}
						</p>
						<p className="truncate text-xl font-bold text-primary">
							{formatCurrency(total)}
						</p>
					</div>
				</div>

				<div className="flex w-full shrink-0 gap-2 sm:w-auto">
					<Button
						variant="outline"
						size="lg"
						className="min-h-11 flex-1 sm:flex-none"
						onClick={onLimpar}
						disabled={qtdItens === 0 || desabilitado}
					>
						<IconTrash className="size-4" />
						<span className="hidden sm:inline">Limpar</span>
					</Button>
					<Button
						size="lg"
						className="min-h-11 flex-[2] sm:min-w-48"
						onClick={onFinalizar}
						disabled={qtdItens === 0 || desabilitado}
					>
						Finalizar venda
					</Button>
				</div>
			</div>
		</div>
	);
}

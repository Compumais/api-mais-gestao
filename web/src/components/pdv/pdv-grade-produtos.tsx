"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/gourmet-utils";
import type { Produto } from "@/services/produtos.service";

interface PdvGradeProdutosProps {
	produtos: Produto[];
	isLoading: boolean;
	onAdicionar: (produto: Produto) => void;
	saldoPorCodigo?: Record<string, number>;
}

function getSaldoInfo(
	produto: Produto,
	saldoPorCodigo?: Record<string, number>,
): { semEstoque: boolean; label: string } {
	if (!saldoPorCodigo || produto.codigo == null) {
		return { semEstoque: false, label: "" };
	}

	const chave = String(produto.codigo);
	if (!(chave in saldoPorCodigo)) {
		return { semEstoque: false, label: "" };
	}

	const quantidade = saldoPorCodigo[chave];
	return {
		semEstoque: quantidade <= 0,
		label: quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 3 }),
	};
}

export function PdvGradeProdutos({
	produtos,
	isLoading,
	onAdicionar,
	saldoPorCodigo,
}: PdvGradeProdutosProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-4">
				{Array.from({ length: 8 }).map((_, i) => (
					<Skeleton key={i.toString()} className="h-28 rounded-xl" />
				))}
			</div>
		);
	}

	if (produtos.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center p-8">
				<p className="text-center text-sm text-muted-foreground">
					Nenhum produto encontrado.
				</p>
			</div>
		);
	}

	return (
		<div className="min-h-0 flex-1 overflow-y-auto p-4">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
				{produtos.map((produto) => {
					const saldo = getSaldoInfo(produto, saldoPorCodigo);
					const desabilitado = saldo.semEstoque;

					return (
						<button
							key={produto.id}
							type="button"
							disabled={desabilitado}
							onClick={() => onAdicionar(produto)}
							className="flex min-h-28 flex-col items-start rounded-xl border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<div className="mb-2 flex w-full items-start justify-between gap-2">
								<span className="line-clamp-2 text-sm font-semibold leading-tight">
									{produto.nome}
								</span>
								{saldo.label && (
									<Badge
										variant={saldo.semEstoque ? "destructive" : "secondary"}
										className="shrink-0 text-[10px]"
									>
										{saldo.semEstoque ? "Sem estoque" : saldo.label}
									</Badge>
								)}
							</div>
							{produto.codigo != null && (
								<span className="text-xs text-muted-foreground">
									Cód. {produto.codigo}
								</span>
							)}
							<span className="mt-auto pt-2 text-base font-bold text-primary">
								{formatCurrency(produto.preco)}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

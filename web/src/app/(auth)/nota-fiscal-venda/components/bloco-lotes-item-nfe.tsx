"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ItemNfe } from "@/schemas/nfe-emissao.schema";
import { lotesService } from "@/services/lotes.service";

type BlocoLotesItemNfeProps = {
	item: ItemNfe;
	idempresa: string;
	idcfop?: string;
	onChange: (rastros: NonNullable<ItemNfe["rastros"]>) => void;
};

function somarRastros(rastros: NonNullable<ItemNfe["rastros"]>): number {
	return rastros.reduce((total, rastro) => total + (rastro.qLote || 0), 0);
}

export function BlocoLotesItemNfe({
	item,
	idempresa,
	idcfop,
	onChange,
}: BlocoLotesItemNfeProps) {
	const rastros = item.rastros ?? [];
	const soma = somarRastros(rastros);
	const fecha = Math.abs(soma - item.quantidade) <= 0.000001;

	const sugerir = useMutation({
		mutationFn: () =>
			lotesService.sugerirFefo({
				idempresa,
				idproduto: item.idproduto ?? "",
				quantidade: item.quantidade,
				idcfop: idcfop || null,
			}),
		onSuccess: (resultado) => {
			if (resultado.lotes.length === 0) {
				toast.error(
					resultado.saldoOrfao > 0
						? "Há saldo sem lote; faça um ajuste de lote ou desmarque o controle no cadastro."
						: "Não há lote com saldo disponível para este produto.",
				);
				return;
			}
			onChange(
				resultado.lotes.map((lote) => ({
					idlote: lote.idlote,
					nLote: lote.numero,
					qLote: lote.quantidade,
					dFab: lote.datafabricacao ?? undefined,
					dVal: lote.datavalidade ?? undefined,
					cAgreg: lote.codigoagregacao ?? undefined,
				})),
			);
			if (resultado.quantidadeFaltante > 0) {
				toast.warning(
					resultado.saldoOrfao > 0
						? "Estoque por lote insuficiente. Há saldo sem lote; faça um ajuste."
						: "Estoque por lote insuficiente para a quantidade do item.",
				);
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || "Não foi possível sugerir lotes FEFO.");
		},
	});

	function atualizarRastro(
		indice: number,
		campo: keyof NonNullable<ItemNfe["rastros"]>[number],
		valor: string | number | undefined,
	) {
		onChange(
			rastros.map((rastro, atual) =>
				atual === indice ? { ...rastro, [campo]: valor } : rastro,
			),
		);
	}

	return (
		<div className="space-y-3 rounded-lg border p-3">
			<div className="flex items-center justify-between gap-2">
				<span className="text-sm font-medium">Lotes</span>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!item.idproduto || sugerir.isPending}
						onClick={() => sugerir.mutate()}
					>
						Sugerir FEFO
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							onChange([
								...rastros,
								{ nLote: "", qLote: Math.max(0, item.quantidade - soma) },
							])
						}
					>
						<Plus className="size-4" />
						Lote
					</Button>
				</div>
			</div>

			{rastros.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Informe os lotes ou use Sugerir FEFO. A soma deve fechar com a
					quantidade do item.
				</p>
			) : (
				<div className="space-y-2">
					{rastros.map((rastro, indice) => (
						<div
							key={`${rastro.idlote ?? "novo"}-${indice}`}
							className="grid grid-cols-[1fr_5.5rem_7rem_7rem_auto] gap-2 items-end"
						>
							<div className="space-y-1">
								<span className="text-xs text-muted-foreground">Número</span>
								<Input
									value={rastro.nLote}
									maxLength={20}
									onChange={(e) =>
										atualizarRastro(indice, "nLote", e.target.value)
									}
								/>
							</div>
							<div className="space-y-1">
								<span className="text-xs text-muted-foreground">Qtd</span>
								<Input
									type="number"
									min="0.001"
									step="0.001"
									value={rastro.qLote}
									onChange={(e) =>
										atualizarRastro(
											indice,
											"qLote",
											parseFloat(e.target.value) || 0,
										)
									}
								/>
							</div>
							<div className="space-y-1">
								<span className="text-xs text-muted-foreground">Fabricação</span>
								<Input
									type="date"
									value={rastro.dFab ?? ""}
									onChange={(e) =>
										atualizarRastro(indice, "dFab", e.target.value || undefined)
									}
								/>
							</div>
							<div className="space-y-1">
								<span className="text-xs text-muted-foreground">Validade</span>
								<Input
									type="date"
									value={rastro.dVal ?? ""}
									onChange={(e) =>
										atualizarRastro(indice, "dVal", e.target.value || undefined)
									}
								/>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() =>
									onChange(rastros.filter((_, atual) => atual !== indice))
								}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
					))}
				</div>
			)}

			<p
				className={`text-xs ${fecha ? "text-muted-foreground" : "text-destructive"}`}
			>
				Soma dos lotes: {soma.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}{" "}
				/ {item.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}
			</p>
		</div>
	);
}

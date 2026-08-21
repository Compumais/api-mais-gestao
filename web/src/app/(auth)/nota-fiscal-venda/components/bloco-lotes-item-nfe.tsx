"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ItemNfe } from "@/schemas/nfe-emissao.schema";
import { lotesService } from "@/services/lotes.service";

export type RastroItemLote = NonNullable<ItemNfe["rastros"]>[number];

type BlocoLotesItemNfeProps = {
	item: Pick<ItemNfe, "idproduto" | "quantidade" | "rastros">;
	idempresa: string;
	idcfop?: string;
	onChange: (rastros: RastroItemLote[]) => void;
};

function somarRastros(rastros: RastroItemLote[]): number {
	return rastros.reduce((total, rastro) => total + (rastro.qLote || 0), 0);
}

function formatarSaldo(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (!Number.isFinite(n)) return "0";
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
}

export function BlocoLotesItemNfe({
	item,
	idempresa,
	idcfop,
	onChange,
}: BlocoLotesItemNfeProps) {
	const queryClient = useQueryClient();
	const rastros = item.rastros ?? [];
	const soma = somarRastros(rastros);
	const fecha = Math.abs(soma - item.quantidade) <= 0.000001;
	const qtdRestante = Math.max(0, item.quantidade - soma);

	const [criando, setCriando] = useState(false);
	const [numeroNovo, setNumeroNovo] = useState("");
	const [fabNovo, setFabNovo] = useState("");
	const [valNovo, setValNovo] = useState("");

	const queryKey = ["lotes-produto-item", idempresa, item.idproduto];

	const { data: lotesData } = useQuery({
		queryKey,
		queryFn: () =>
			lotesService.listarPorProduto(item.idproduto ?? "", idempresa),
		enabled: !!idempresa && !!item.idproduto,
	});

	const lotesDisponiveis = (lotesData?.lotes ?? []).filter(
		(lote) =>
			!rastros.some((rastro) => rastro.idlote === lote.id) &&
			Number.parseFloat(lote.quantidade ?? "0") > 0,
	);

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

	const criarLote = useMutation({
		mutationFn: () =>
			lotesService.criar({
				idempresa,
				idproduto: item.idproduto ?? "",
				numero: numeroNovo.trim(),
				datafabricacao: fabNovo || null,
				datavalidade: valNovo || null,
			}),
		onSuccess: async (lote) => {
			onChange([
				...rastros,
				{
					idlote: lote.id,
					nLote: lote.numero,
					qLote: qtdRestante > 0 ? qtdRestante : 1,
					dFab: lote.datafabricacao ?? undefined,
					dVal: lote.datavalidade ?? undefined,
					cAgreg: lote.codigoagregacao ?? undefined,
				},
			]);
			setNumeroNovo("");
			setFabNovo("");
			setValNovo("");
			setCriando(false);
			toast.success("Lote criado e vinculado ao item");
			await queryClient.invalidateQueries({ queryKey });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Não foi possível criar o lote.");
		},
	});

	function atualizarRastro(
		indice: number,
		campo: keyof RastroItemLote,
		valor: string | number | undefined,
	) {
		onChange(
			rastros.map((rastro, atual) =>
				atual === indice ? { ...rastro, [campo]: valor } : rastro,
			),
		);
	}

	function selecionarLoteExistente(idlote: string) {
		const lote = lotesDisponiveis.find((itemLote) => itemLote.id === idlote);
		if (!lote) return;
		const saldo = Number.parseFloat(lote.quantidade ?? "0") || 0;
		onChange([
			...rastros,
			{
				idlote: lote.id,
				nLote: lote.numero,
				qLote: Math.min(qtdRestante > 0 ? qtdRestante : saldo, saldo) || 1,
				dFab: lote.datafabricacao ?? undefined,
				dVal: lote.datavalidade ?? undefined,
				cAgreg: lote.codigoagregacao ?? undefined,
			},
		]);
	}

	return (
		<div className="space-y-3 rounded-lg border p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="text-sm font-medium">Lotes</span>
				<div className="flex flex-wrap gap-2">
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
						disabled={!item.idproduto}
						onClick={() => setCriando((atual) => !atual)}
					>
						<Plus className="size-4" />
						Criar lote
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
						Linha
					</Button>
				</div>
			</div>

			{item.idproduto ? (
				<div className="space-y-1">
					<span className="text-xs text-muted-foreground">
						Selecionar lote existente
					</span>
					<Select
						key={`selecionar-lote-${rastros.length}`}
						onValueChange={selecionarLoteExistente}
						disabled={lotesDisponiveis.length === 0}
					>
						<SelectTrigger className="w-full">
							<SelectValue
								placeholder={
									lotesDisponiveis.length === 0
										? "Nenhum lote com saldo disponível"
										: "Escolha um lote..."
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{lotesDisponiveis.map((lote) => (
								<SelectItem key={lote.id} value={lote.id}>
									{lote.numero} · saldo {formatarSaldo(lote.quantidade)}
									{lote.datavalidade ? ` · val. ${lote.datavalidade}` : ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : null}

			{criando ? (
				<div className="grid grid-cols-[1fr_7rem_7rem_auto] gap-2 items-end rounded-md border border-dashed p-2">
					<div className="space-y-1">
						<span className="text-xs text-muted-foreground">Novo lote</span>
						<Input
							value={numeroNovo}
							maxLength={20}
							placeholder="Número"
							onChange={(e) => setNumeroNovo(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<span className="text-xs text-muted-foreground">Fabricação</span>
						<Input
							type="date"
							value={fabNovo}
							onChange={(e) => setFabNovo(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<span className="text-xs text-muted-foreground">Validade</span>
						<Input
							type="date"
							value={valNovo}
							onChange={(e) => setValNovo(e.target.value)}
						/>
					</div>
					<Button
						type="button"
						size="sm"
						disabled={!numeroNovo.trim() || criarLote.isPending || !item.idproduto}
						onClick={() => criarLote.mutate()}
					>
						{criarLote.isPending ? "Salvando..." : "Salvar"}
					</Button>
				</div>
			) : null}

			{rastros.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Selecione um lote, crie um novo ou use Sugerir FEFO. A soma deve fechar
					com a quantidade do item.
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

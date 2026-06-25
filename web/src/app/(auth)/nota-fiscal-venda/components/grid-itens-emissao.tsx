"use client";

import { useCallback, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Combobox } from "@/components/ui/combobox";
import type { ItemNfe } from "@/schemas/nfe-emissao.schema";
import { produtosService } from "@/services/produtos.service";

interface GridItensEmissaoProps {
	idempresa: string;
	itens: ItemNfe[];
	onChange: (itens: ItemNfe[]) => void;
	disabled?: boolean;
}

const ITEM_VAZIO: ItemNfe = {
	descricao: "",
	ncm: "",
	cfop: "",
	unidade: "UN",
	quantidade: 1,
	valorUnitario: 0,
	orig: 0,
};

const formatarMoeda = (v: number) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	}).format(v);

export function GridItensEmissao({
	idempresa,
	itens,
	onChange,
	disabled = false,
}: GridItensEmissaoProps) {
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

	const { data: produtosData } = useQuery({
		queryKey: ["produtos-emissao", idempresa],
		queryFn: () => produtosService.listarTodos({ idempresa, inativo: 0 }),
		enabled: !!idempresa,
	});

	const produtos = produtosData ?? [];

	const opcoesProdutos = produtos.map((p) => ({
		value: p.id,
		label: p.nome,
	}));

	const toggleRow = useCallback((index: number) => {
		setExpandedRows((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	}, []);

	const adicionarItem = useCallback(() => {
		onChange([...itens, { ...ITEM_VAZIO }]);
	}, [itens, onChange]);

	const removerItem = useCallback(
		(index: number) => {
			setExpandedRows((prev) => {
				const next = new Set<number>();
				for (const r of prev) {
					if (r < index) next.add(r);
					else if (r > index) next.add(r - 1);
				}
				return next;
			});
			onChange(itens.filter((_, i) => i !== index));
		},
		[itens, onChange],
	);

	const atualizarItem = useCallback(
		(index: number, campo: keyof ItemNfe, valor: unknown) => {
			const novosItens = itens.map((item, i) =>
				i === index ? { ...item, [campo]: valor } : item,
			);
			onChange(novosItens);
		},
		[itens, onChange],
	);

	const selecionarProduto = useCallback(
		(index: number, idproduto: string) => {
			const produto = produtos.find((p) => p.id === idproduto);
			if (!produto) return;

			const item: ItemNfe = {
				...itens[index],
				idproduto: produto.id,
				descricao: produto.nome,
				ncm: produto.ncm ?? "",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: produto.preco ? parseFloat(produto.preco) : 0,
				cst: produto.situacaotributaria ?? undefined,
				csosn: produto.situacaotributariasn ?? undefined,
				orig: produto.origem ?? 0,
				cstPis: produto.cstpis ? String(produto.cstpis) : undefined,
				cstCofins: produto.cstcofins ? String(produto.cstcofins) : undefined,
			};

			const novosItens = itens.map((it, i) => (i === index ? item : it));
			onChange(novosItens);

			if (!expandedRows.has(index)) {
				setExpandedRows((prev) => new Set([...prev, index]));
			}
		},
		[itens, onChange, produtos, expandedRows],
	);

	const calcularTotal = (item: ItemNfe) =>
		(item.quantidade || 0) * (item.valorUnitario || 0);

	return (
		<div className="space-y-3">
			{/* ── Cabeçalho ─────────────────────────────────────── */}
			{itens.length > 0 && (
				<div className="hidden sm:grid grid-cols-[2rem_1fr_3.5rem_4rem_7rem_6rem_2rem] gap-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
					<span>#</span>
					<span>Produto / Descrição</span>
					<span>UN</span>
					<span>Qtd</span>
					<span>Vlr Unit.</span>
					<span className="text-right">Total</span>
					<span />
				</div>
			)}

			{/* ── Linhas ─────────────────────────────────────────── */}
			<div className="space-y-2">
				{itens.length === 0 && (
					<div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
						Nenhum item adicionado. Clique em "+ Adicionar item" para começar.
					</div>
				)}

				{itens.map((item, index) => {
					const isExpanded = expandedRows.has(index);
					const total = calcularTotal(item);
					// eslint-disable-next-line react/no-array-index-key
					const rowKey = `item-${index}-${item.idproduto ?? "novo"}`;

					return (
						<div
							key={rowKey}
							className="rounded-lg border bg-card overflow-hidden"
						>
							{/* Linha principal */}
							<div className="grid grid-cols-[2rem_1fr_3.5rem_4rem_7rem_6rem_2rem] gap-2 items-center p-2">
								{/* # */}
								<span className="text-center text-xs text-muted-foreground font-medium">
									{index + 1}
								</span>

								{/* Produto */}
								{disabled ? (
									<span className="text-sm truncate">{item.descricao}</span>
								) : (
									<Combobox
										options={opcoesProdutos}
										value={item.idproduto ?? ""}
										onChange={(v) => selecionarProduto(index, v)}
										placeholder="Selecionar produto..."
										searchPlaceholder="Buscar produto..."
										emptyMessage="Produto não encontrado."
										className="h-8 text-sm"
									/>
								)}

								{/* UN */}
								{disabled ? (
									<span className="text-sm text-center">{item.unidade}</span>
								) : (
									<Input
										value={item.unidade}
										onChange={(e) =>
											atualizarItem(index, "unidade", e.target.value.toUpperCase())
										}
										className="h-8 text-sm text-center px-1"
										maxLength={6}
									/>
								)}

								{/* Qtd */}
								{disabled ? (
									<span className="text-sm text-right">{item.quantidade}</span>
								) : (
									<Input
										type="number"
										min="0.001"
										step="0.001"
										value={item.quantidade}
										onChange={(e) =>
											atualizarItem(
												index,
												"quantidade",
												parseFloat(e.target.value) || 0,
											)
										}
										className="h-8 text-sm text-right px-2"
									/>
								)}

								{/* Vlr Unit */}
								{disabled ? (
									<span className="text-sm text-right">
										{formatarMoeda(item.valorUnitario)}
									</span>
								) : (
									<MoneyInput
										value={String(item.valorUnitario ?? 0)}
										onChange={(v) =>
											atualizarItem(
												index,
												"valorUnitario",
												v ? parseFloat(v) : 0,
											)
										}
										className="h-8 text-sm text-right"
									/>
								)}

								{/* Total */}
								<span className="text-sm font-semibold text-right pr-1">
									{formatarMoeda(total)}
								</span>

								{/* Remover */}
								{disabled ? (
									<span />
								) : (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-7 w-7 text-muted-foreground hover:text-destructive"
										onClick={() => removerItem(index)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								)}
							</div>

							{/* Toggle dados fiscais */}
							<button
								type="button"
								onClick={() => toggleRow(index)}
								className="w-full flex items-center gap-1 px-3 pb-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								{isExpanded ? (
									<ChevronDown className="h-3 w-3" />
								) : (
									<ChevronRight className="h-3 w-3" />
								)}
								Dados fiscais
								{(item.cfop || item.ncm || item.cst || item.csosn) && (
									<span className="ml-1 text-xs font-medium text-foreground/60">
										{[
											item.cfop && `CFOP ${item.cfop}`,
											item.ncm && `NCM ${item.ncm}`,
											(item.cst ?? item.csosn) &&
												`CST/CSOSN ${item.cst ?? item.csosn}`,
										]
											.filter(Boolean)
											.join(" · ")}
									</span>
								)}
							</button>

							{/* Linha fiscal (expansível) */}
							{isExpanded && (
								<div className="border-t bg-muted/30 px-3 py-3">
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
										<div>
											<span className="text-xs font-medium text-muted-foreground block mb-1">
												CFOP
											</span>
											<Input
												value={item.cfop}
												onChange={(e) =>
													atualizarItem(index, "cfop", e.target.value)
												}
												placeholder="5102"
												className="h-7 text-sm"
												maxLength={5}
												disabled={disabled}
											/>
										</div>

										<div>
											<span className="text-xs font-medium text-muted-foreground block mb-1">
												NCM
											</span>
											<Input
												value={item.ncm}
												onChange={(e) =>
													atualizarItem(index, "ncm", e.target.value)
												}
												placeholder="00000000"
												className="h-7 text-sm"
												maxLength={8}
												disabled={disabled}
											/>
										</div>

										<div>
											<span className="text-xs font-medium text-muted-foreground block mb-1">
												CST / CSOSN
											</span>
											<Input
												value={item.cst ?? item.csosn ?? ""}
												onChange={(e) =>
													atualizarItem(index, "cst", e.target.value)
												}
												placeholder="000"
												className="h-7 text-sm"
												maxLength={3}
												disabled={disabled}
											/>
										</div>

										<div>
											<span className="text-xs font-medium text-muted-foreground block mb-1">
												Orig.
											</span>
											<Input
												type="number"
												min="0"
												max="8"
												value={item.orig ?? 0}
												onChange={(e) =>
													atualizarItem(
														index,
														"orig",
														parseInt(e.target.value) || 0,
													)
												}
												className="h-7 text-sm"
												disabled={disabled}
											/>
										</div>

										<div>
											<span className="text-xs font-medium text-muted-foreground block mb-1">
												CST PIS
											</span>
											<Input
												value={item.cstPis ?? ""}
												onChange={(e) =>
													atualizarItem(index, "cstPis", e.target.value)
												}
												placeholder="07"
												className="h-7 text-sm"
												maxLength={2}
												disabled={disabled}
											/>
										</div>

										<div>
											<span className="text-xs font-medium text-muted-foreground block mb-1">
												CST COFINS
											</span>
											<Input
												value={item.cstCofins ?? ""}
												onChange={(e) =>
													atualizarItem(index, "cstCofins", e.target.value)
												}
												placeholder="07"
												className="h-7 text-sm"
												maxLength={2}
												disabled={disabled}
											/>
										</div>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* ── Rodapé do grid ─────────────────────────────────── */}
			<div className="flex items-center justify-between pt-1">
				{!disabled && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={adicionarItem}
						className="gap-2"
					>
						<Plus className="h-4 w-4" />
						Adicionar item
					</Button>
				)}

				{itens.length > 0 && (
					<div className="ml-auto text-sm text-muted-foreground">
						Subtotal produtos:{" "}
						<span className="font-semibold text-foreground">
							{formatarMoeda(
								itens.reduce((acc, item) => acc + calcularTotal(item), 0),
							)}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

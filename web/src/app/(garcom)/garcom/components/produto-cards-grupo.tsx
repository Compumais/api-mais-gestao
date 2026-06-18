"use client";

import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	filtrarProdutosPorBusca,
	getSaldoProduto,
	type GrupoProdutos,
} from "@/lib/garcom-utils";
import { formatCurrency } from "@/lib/gourmet-utils";
import type { Produto } from "@/services/produtos.service";
import { cn } from "@/lib/utils";
import { GrupoImagem } from "./grupo-imagem";

interface ProdutoCardsGrupoProps {
	produtosPorGrupo: GrupoProdutos[];
	isLoading: boolean;
	onAdicionar: (produto: Produto) => void;
	isAdding?: boolean;
	saldoPorCodigo?: Record<string, number>;
}

const CHIP_TODOS = "__todos__";

export function ProdutoCardsGrupo({
	produtosPorGrupo,
	isLoading,
	onAdicionar,
	isAdding,
	saldoPorCodigo,
}: ProdutoCardsGrupoProps) {
	const [busca, setBusca] = useState("");
	const [grupoAtivo, setGrupoAtivo] = useState<string>(CHIP_TODOS);

	const gruposFiltrados = useMemo(() => {
		return produtosPorGrupo
			.map((grupo) => ({
				...grupo,
				produtos: filtrarProdutosPorBusca(grupo.produtos, busca),
			}))
			.filter((grupo) => grupo.produtos.length > 0);
	}, [produtosPorGrupo, busca]);

	const gruposVisiveis = useMemo(() => {
		if (grupoAtivo === CHIP_TODOS) return gruposFiltrados;
		return gruposFiltrados.filter((g) => g.grupoId === grupoAtivo);
	}, [gruposFiltrados, grupoAtivo]);

	const chips = useMemo(() => {
		return produtosPorGrupo
			.map((g) => ({
				id: g.grupoId,
				nome: g.nome,
				icone: g.icone,
				count: filtrarProdutosPorBusca(g.produtos, busca).length,
			}))
			.filter((g) => g.count > 0);
	}, [produtosPorGrupo, busca]);

	const grupoSelecionado =
		grupoAtivo !== CHIP_TODOS
			? gruposVisiveis.find((g) => g.grupoId === grupoAtivo)
			: null;

	return (
		<div className="flex h-full flex-col">
			<div className="shrink-0 space-y-3 border-b bg-background p-3">
				<div className="relative">
					<IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Buscar produto..."
						value={busca}
						onChange={(e) => setBusca(e.target.value)}
						className="h-11 pl-9 text-base"
					/>
				</div>

				{!isLoading && chips.length > 0 && (
					<div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<button
							type="button"
							onClick={() => setGrupoAtivo(CHIP_TODOS)}
							className={cn(
								"shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
								grupoAtivo === CHIP_TODOS
									? "border-primary bg-primary text-primary-foreground"
									: "bg-muted/50 hover:bg-muted",
							)}
						>
							Todos
						</button>
						{chips.map((chip) => (
							<button
								key={chip.id}
								type="button"
								onClick={() => setGrupoAtivo(chip.id)}
								className={cn(
									"flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
									grupoAtivo === chip.id
										? "border-primary bg-primary text-primary-foreground"
										: "bg-muted/50 hover:bg-muted",
								)}
							>
								<GrupoImagem src={chip.icone} nome={chip.nome} size="chip" />
								{chip.nome}
							</button>
						))}
					</div>
				)}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-3 pb-24">
				{isLoading && (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i.toString()} className="h-24 rounded-xl" />
						))}
					</div>
				)}

				{!isLoading && gruposFiltrados.length === 0 && (
					<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
						<p className="font-medium">Nenhum produto disponível</p>
						<p className="max-w-xs text-sm text-muted-foreground">
							Ative &quot;Exibir no garçom&quot; no grupo (hierarquia) e no
							produto, e vincule o produto ao grupo.
						</p>
					</div>
				)}

				{!isLoading && grupoSelecionado && (
					<div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
						<GrupoImagem
							src={grupoSelecionado.icone}
							nome={grupoSelecionado.nome}
							size="banner"
						/>
						<h2 className="text-base font-semibold">{grupoSelecionado.nome}</h2>
					</div>
				)}

				{!isLoading &&
					gruposVisiveis.map((grupo) => (
						<section key={grupo.grupoId} className="mb-6">
							{grupoAtivo === CHIP_TODOS && (
								<div className="mb-3 flex items-center gap-2">
									<GrupoImagem
										src={grupo.icone}
										nome={grupo.nome}
										size="header"
									/>
									<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
										{grupo.nome}
									</h2>
								</div>
							)}
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								{grupo.produtos.map((produto) => {
									const saldo = getSaldoProduto(produto, saldoPorCodigo);
									const bloqueado = saldo.semEstoque;

									return (
										<Card
											key={produto.id}
											className={cn(
												"cursor-pointer transition-transform active:scale-[0.97]",
												bloqueado && "cursor-not-allowed opacity-50",
												isAdding && "pointer-events-none opacity-70",
											)}
											onClick={() => {
												if (!bloqueado && !isAdding) onAdicionar(produto);
											}}
										>
											<CardContent className="flex min-h-[88px] flex-col justify-between p-3">
												<div>
													<p className="line-clamp-2 text-sm font-medium leading-tight">
														{produto.nome}
													</p>
													{bloqueado && (
														<Badge
															variant="destructive"
															className="mt-1 text-[10px]"
														>
															Sem estoque
														</Badge>
													)}
												</div>
												<p className="mt-2 text-base font-bold text-primary">
													{formatCurrency(produto.preco)}
												</p>
											</CardContent>
										</Card>
									);
								})}
							</div>
						</section>
					))}
			</div>
		</div>
	);
}

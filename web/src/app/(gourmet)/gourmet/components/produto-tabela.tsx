"use client";

import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/gourmet-utils";
import type { Produto } from "@/services/produtos.service";

interface ProdutoTabelaProps {
	produtos: Produto[];
	isLoading: boolean;
	onAdicionar: (produto: Produto) => void;
	isAdding?: boolean;
	/** Mapa codigoProduto → quantidade em estoque vindo de saldoestoque */
	saldoPorCodigo?: Record<string, number>;
}

function getSaldoInfo(
	produto: Produto,
	saldoPorCodigo?: Record<string, number>,
): { quantidade: number | null; semEstoque: boolean; label: string } {
	if (!saldoPorCodigo || produto.codigo == null) {
		// Produto sem código ou sem dados de saldo: não gerenciado, venda livre
		return { quantidade: null, semEstoque: false, label: "—" };
	}

	const chave = String(produto.codigo);
	if (!(chave in saldoPorCodigo)) {
		// Sem registro de saldo: produto não gerenciado no estoque
		return { quantidade: null, semEstoque: false, label: "—" };
	}

	const quantidade = saldoPorCodigo[chave];
	const semEstoque = quantidade <= 0;
	return {
		quantidade,
		semEstoque,
		label: quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 3 }),
	};
}

export function ProdutoTabela({
	produtos,
	isLoading,
	onAdicionar,
	isAdding,
	saldoPorCodigo,
}: ProdutoTabelaProps) {
	const [busca, setBusca] = useState("");

	const produtosFiltrados = produtos.filter((p) => {
		if (!busca.trim()) return true;
		const termo = busca.toLowerCase();
		return (
			p.nome.toLowerCase().includes(termo) ||
			p.codigo?.toString().includes(termo) ||
			p.referencia?.toLowerCase().includes(termo)
		);
	});

	return (
		<div className="flex h-full flex-col gap-4 p-4">
			<div className="relative">
				<IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Buscar por código ou nome..."
					value={busca}
					onChange={(e) => setBusca(e.target.value)}
					className="pl-9"
				/>
			</div>

			<div className="min-h-0 flex-1 overflow-auto rounded-lg border">
				{isLoading ? (
					<div className="space-y-2 p-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<Skeleton key={i.toString()} className="h-10 w-full" />
						))}
					</div>
				) : (
					<Table>
						<TableHeader className="sticky top-0 bg-background">
							<TableRow>
								<TableHead className="w-[100px]">Código</TableHead>
								<TableHead>Nome</TableHead>
								<TableHead className="w-[100px] text-right">Estoque</TableHead>
								<TableHead className="w-[120px] text-right">Valor</TableHead>
								<TableHead className="w-[80px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{produtosFiltrados.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="h-24 text-center text-muted-foreground"
									>
										Nenhum produto encontrado
									</TableCell>
								</TableRow>
							) : (
								produtosFiltrados.map((produto) => {
									const saldo = getSaldoInfo(produto, saldoPorCodigo);
									const bloqueado = saldo.semEstoque;

									return (
										<TableRow
											key={produto.id}
											data-bloqueado={bloqueado}
											className={
												bloqueado
													? "cursor-not-allowed opacity-50"
													: "cursor-pointer hover:bg-accent/40"
											}
											onClick={() => {
												if (!bloqueado) onAdicionar(produto);
											}}
										>
											<TableCell className="font-mono text-sm">
												{produto.codigo ?? "—"}
											</TableCell>
											<TableCell className="font-medium">
												{produto.nome}
												{bloqueado && (
													<Badge
														variant="destructive"
														className="ml-2 text-xs"
													>
														Sem estoque
													</Badge>
												)}
											</TableCell>
											<TableCell className="text-right text-muted-foreground">
												{saldo.semEstoque ? (
													<span className="font-semibold text-destructive">
														{saldo.label}
													</span>
												) : (
													saldo.label
												)}
											</TableCell>
											<TableCell className="text-right font-semibold text-primary">
												{formatCurrency(produto.preco)}
											</TableCell>
											<TableCell className="text-right">
												<Button
													type="button"
													size="icon-sm"
													variant="ghost"
													disabled={isAdding || bloqueado}
													title={
														bloqueado
															? "Produto sem estoque disponível"
															: `Adicionar ${produto.nome}`
													}
													onClick={(e) => {
														e.stopPropagation();
														if (!bloqueado) onAdicionar(produto);
													}}
													aria-label={`Adicionar ${produto.nome}`}
												>
													<IconPlus className="size-4" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				)}
			</div>
			{isAdding && (
				<p className="text-center text-sm text-muted-foreground">
					Adicionando item...
				</p>
			)}
		</div>
	);
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { produtosService } from "@/services/produtos.service";
import type { PedidoDavItem } from "@/services/dav.service";

type ModalItemPedidoProps = {
	open: boolean;
	onClose: () => void;
	onConfirmar: (dados: {
		idproduto: string;
		quantidade: string;
		preco: string;
		unidademedida?: string;
	}) => void;
	idempresa: string;
	itemParaEditar?: PedidoDavItem | null;
	carregando?: boolean;
};

const formatarMoeda = (valor: string | null | undefined) => {
	const numero = parseFloat(valor ?? "0");
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number.isFinite(numero) ? numero : 0);
};

function formatarLabelProduto(produto: {
	codigo: number | null;
	descricao: string;
	nome: string;
}) {
	return `${produto.codigo ?? "—"} — ${produto.descricao || produto.nome}`;
}

function normalizarPrecoProduto(valor: string | null | undefined): string {
	const numero = parseFloat(String(valor ?? "").replace(",", "."));
	if (!Number.isFinite(numero) || numero < 0) return "0.00";
	return numero.toFixed(2);
}

export function ModalItemPedido({
	open,
	onClose,
	onConfirmar,
	idempresa,
	itemParaEditar,
	carregando = false,
}: ModalItemPedidoProps) {
	const searchRef = useRef<HTMLInputElement>(null);
	const [idproduto, setIdproduto] = useState("");
	const [busca, setBusca] = useState("");
	const [buscaDebounced, setBuscaDebounced] = useState("");
	const [quantidade, setQuantidade] = useState("1");
	const [preco, setPreco] = useState("0.00");
	const [carregandoProduto, setCarregandoProduto] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setBuscaDebounced(busca), 300);
		return () => window.clearTimeout(timer);
	}, [busca]);

	const { data: produtosData, isFetching: buscandoProdutos } = useQuery({
		queryKey: ["produtos-pedido-busca", idempresa, buscaDebounced],
		queryFn: () =>
			produtosService.listar({
				idempresa,
				q: buscaDebounced.trim() || undefined,
				page: 1,
				limit: 20,
				inativo: 0,
			}),
		enabled: open && !!idempresa,
	});

	const produtos = produtosData?.data ?? [];

	useEffect(() => {
		if (!open) return;

		if (itemParaEditar) {
			setIdproduto(itemParaEditar.idproduto ?? "");
			setBusca(itemParaEditar.nomeproduto ?? "");
			setQuantidade(itemParaEditar.quantidade ?? "1");
			setPreco(normalizarPrecoProduto(itemParaEditar.preco));
			return;
		}

		setIdproduto("");
		setBusca("");
		setQuantidade("1");
		setPreco("0.00");
		setTimeout(() => searchRef.current?.focus(), 100);
	}, [open, itemParaEditar]);

	async function selecionarProduto(produtoId: string) {
		setCarregandoProduto(true);
		try {
			const produto = await produtosService.buscar(produtoId);
			setIdproduto(produto.id);
			setBusca(formatarLabelProduto(produto));
			setPreco(normalizarPrecoProduto(produto.preco));
		} finally {
			setCarregandoProduto(false);
		}
	}

	function handleConfirmar() {
		const qtd = parseFloat(quantidade.replace(",", "."));
		const valor = parseFloat(preco.replace(",", "."));
		if (!idproduto || !Number.isFinite(qtd) || qtd <= 0) return;
		if (!Number.isFinite(valor) || valor <= 0) return;

		onConfirmar({
			idproduto,
			quantidade: qtd.toFixed(4),
			preco: valor.toFixed(6),
		});
	}

	const mostrarSugestoes =
		!idproduto &&
		!buscandoProdutos &&
		!carregandoProduto &&
		produtos.length > 0;

	return (
		<Dialog open={open} onOpenChange={(aberto) => !aberto && onClose()}>
			<DialogContent className="max-w-2xl gap-4 overflow-x-hidden sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{itemParaEditar ? "Editar item do pedido" : "Adicionar item ao pedido"}
					</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					<Field>
						<FieldLabel>Produto</FieldLabel>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								ref={searchRef}
								className="pl-9"
								placeholder="Buscar por nome, código ou código de barras..."
								value={busca}
								disabled={carregando || carregandoProduto}
								onChange={(event) => {
									const valor = event.target.value;
									setBusca(valor);
									if (idproduto) {
										setIdproduto("");
										setPreco("0.00");
									}
								}}
							/>
						</div>

						{(buscandoProdutos || carregandoProduto) && (
							<p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
								{carregandoProduto
									? "Carregando preço do produto..."
									: "Buscando produtos..."}
							</p>
						)}

						{mostrarSugestoes && (
							<div className="max-h-72 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
								{produtos.map((produto) => (
									<button
										key={produto.id}
										type="button"
										className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
										onClick={() => void selecionarProduto(produto.id)}
									>
										<span className="min-w-0 flex-1 break-words font-medium">
											{formatarLabelProduto(produto)}
										</span>
										<span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
											{produto.preco ? formatarMoeda(produto.preco) : "—"}
										</span>
									</button>
								))}
							</div>
						)}

						{!idproduto &&
							!buscandoProdutos &&
							!carregandoProduto &&
							produtos.length === 0 && (
								<p className="px-1 text-xs text-muted-foreground">
									{busca.trim()
										? "Nenhum produto encontrado."
										: "Nenhum produto ativo cadastrado."}
								</p>
							)}
					</Field>

					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="quantidade-item">Quantidade</FieldLabel>
							<Input
								id="quantidade-item"
								type="number"
								min="0.0001"
								step="0.0001"
								value={quantidade}
								onChange={(event) => setQuantidade(event.target.value)}
								disabled={carregando}
							/>
						</Field>

						<Field>
							<FieldLabel>Preço unitário</FieldLabel>
							<MoneyInput
								key={`preco-${idproduto || "novo"}`}
								value={preco}
								onChange={setPreco}
								disabled={carregando || carregandoProduto}
							/>
						</Field>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={carregando}>
						Cancelar
					</Button>
					<Button onClick={handleConfirmar} disabled={carregando || !idproduto}>
						{carregando ? "Salvando..." : "Confirmar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

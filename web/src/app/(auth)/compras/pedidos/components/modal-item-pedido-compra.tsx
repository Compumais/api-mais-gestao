"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { formatarMoeda } from "@/constants/compras-constants";
import type { PedidoCompraItemFormData } from "@/schemas/pedido-compra.schema";
import { produtosService } from "@/services/produtos.service";

type ModalItemPedidoCompraProps = {
	open: boolean;
	onClose: () => void;
	onConfirmar: (dados: PedidoCompraItemFormData) => void;
	idempresa: string;
	itemParaEditar?: PedidoCompraItemFormData | null;
};

function formatarLabelProduto(produto: {
	codigo: number | null;
	descricao: string;
	nome: string;
}) {
	return `${produto.codigo ?? "—"} — ${produto.descricao || produto.nome}`;
}

function precoPadraoProduto(produto: {
	custoaquisicao?: string | null;
	preco: string | null;
}) {
	const custo = Number.parseFloat(String(produto.custoaquisicao ?? ""));
	if (Number.isFinite(custo) && custo > 0) return custo.toFixed(2);
	const preco = Number.parseFloat(String(produto.preco ?? ""));
	if (Number.isFinite(preco) && preco >= 0) return preco.toFixed(2);
	return "0.00";
}

export function ModalItemPedidoCompra({
	open,
	onClose,
	onConfirmar,
	idempresa,
	itemParaEditar,
}: ModalItemPedidoCompraProps) {
	const searchRef = useRef<HTMLInputElement>(null);
	const [idproduto, setIdproduto] = useState("");
	const [busca, setBusca] = useState("");
	const [buscaDebounced, setBuscaDebounced] = useState("");
	const [quantidade, setQuantidade] = useState("1");
	const [precounitario, setPrecounitario] = useState("0.00");
	const [nomeproduto, setNomeproduto] = useState("");
	const [codigoproduto, setCodigoproduto] = useState<number | null>(null);
	const [carregandoProduto, setCarregandoProduto] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setBuscaDebounced(busca), 300);
		return () => window.clearTimeout(timer);
	}, [busca]);

	const { data: produtosData, isFetching: buscandoProdutos } = useQuery({
		queryKey: ["produtos-pedido-compra-busca", idempresa, buscaDebounced],
		queryFn: () =>
			produtosService.listar({
				idempresa,
				q: buscaDebounced.trim() || undefined,
				page: 1,
				limit: 20,
				inativo: 0,
				tipo: "P",
			}),
		enabled: open && !!idempresa,
	});

	const produtos = produtosData?.data ?? [];

	useEffect(() => {
		if (!open) return;

		if (itemParaEditar) {
			setIdproduto(itemParaEditar.idproduto);
			setBusca(itemParaEditar.nomeproduto || itemParaEditar.descricao || "");
			setQuantidade(itemParaEditar.quantidade);
			setPrecounitario(itemParaEditar.precounitario);
			setNomeproduto(itemParaEditar.nomeproduto || itemParaEditar.descricao || "");
			setCodigoproduto(itemParaEditar.codigoproduto ?? null);
			return;
		}

		setIdproduto("");
		setBusca("");
		setQuantidade("1");
		setPrecounitario("0.00");
		setNomeproduto("");
		setCodigoproduto(null);
		setTimeout(() => searchRef.current?.focus(), 100);
	}, [open, itemParaEditar]);

	async function selecionarProduto(produtoId: string) {
		setCarregandoProduto(true);
		try {
			const produto = await produtosService.buscar(produtoId);
			setIdproduto(produto.id);
			setBusca(formatarLabelProduto(produto));
			setNomeproduto(produto.descricao || produto.nome);
			setCodigoproduto(produto.codigo);
			setPrecounitario(precoPadraoProduto(produto));
		} finally {
			setCarregandoProduto(false);
		}
	}

	const qtd = Number.parseFloat(quantidade.replace(",", "."));
	const preco = Number.parseFloat(String(precounitario).replace(",", "."));
	const podeConfirmar =
		Boolean(idproduto) &&
		Number.isFinite(qtd) &&
		qtd > 0 &&
		Number.isFinite(preco) &&
		preco >= 0;
	const totalItem =
		podeConfirmar ? (Math.round(qtd * preco * 100) / 100).toFixed(2) : "0.00";

	function handleConfirmar() {
		if (!podeConfirmar) return;
		onConfirmar({
			idproduto,
			descricao: nomeproduto,
			nomeproduto,
			codigoproduto,
			quantidade: String(qtd),
			precounitario: preco.toFixed(2),
			total: totalItem,
		});
	}

	const mostrarSugestoes =
		!idproduto &&
		!buscandoProdutos &&
		!carregandoProduto &&
		produtos.length > 0;

	return (
		<Dialog open={open} onOpenChange={(aberto) => !aberto && onClose()}>
			<DialogContent className="max-w-xl gap-4">
				<DialogHeader>
					<DialogTitle>
						{itemParaEditar ? "Editar item" : "Adicionar produto"}
					</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					<Field>
						<FieldLabel>Produto do cadastro</FieldLabel>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								ref={searchRef}
								className="pl-9"
								placeholder="Buscar produto pelo código ou nome..."
								value={busca}
								disabled={carregandoProduto}
								onChange={(event) => {
									setBusca(event.target.value);
									setNomeproduto(event.target.value);
									if (idproduto) {
										setIdproduto("");
										setCodigoproduto(null);
									}
								}}
							/>
						</div>
						{(buscandoProdutos || carregandoProduto) && (
							<p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
								Buscando produtos...
							</p>
						)}
						{mostrarSugestoes && (
							<div className="max-h-72 overflow-y-auto rounded-md border bg-popover shadow-md">
								{produtos.map((produto) => (
									<button
										key={produto.id}
										type="button"
										className="flex w-full px-3 py-2.5 text-left text-sm hover:bg-accent"
										onClick={() => void selecionarProduto(produto.id)}
									>
										{formatarLabelProduto(produto)}
									</button>
								))}
							</div>
						)}
					</Field>

					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="quantidade-pedido-compra">
								Quantidade
							</FieldLabel>
							<Input
								id="quantidade-pedido-compra"
								type="number"
								min="0.0001"
								step="0.0001"
								value={quantidade}
								onChange={(event) => setQuantidade(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="preco-pedido-compra">Preço unitário</FieldLabel>
							<MoneyInput
								id="preco-pedido-compra"
								value={precounitario}
								onChange={setPrecounitario}
							/>
						</Field>
					</div>
					<p className="text-sm text-muted-foreground">
						Total do item: {formatarMoeda(totalItem)}
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button onClick={handleConfirmar} disabled={!podeConfirmar}>
						Confirmar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

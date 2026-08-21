"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
	BlocoLotesItemNfe,
	type RastroItemLote,
} from "@/app/(auth)/nota-fiscal-venda/components/bloco-lotes-item-nfe";
import { produtosService } from "@/services/produtos.service";
import type { PedidoDavItem, PedidoDavItemRastro } from "@/services/dav.service";

type DadosItemPedido = {
	idproduto: string;
	quantidade: string;
	preco: string;
	unidademedida?: string;
	rastros?: PedidoDavItemRastro[];
};

type ModalItemPedidoProps = {
	open: boolean;
	onClose: () => void;
	onConfirmar: (dados: DadosItemPedido) => void;
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

function rastrosParaUi(
	rastros: PedidoDavItemRastro[] | undefined,
): RastroItemLote[] {
	return (rastros ?? []).map((rastro) => ({
		idlote: rastro.idlote,
		nLote: rastro.nLote,
		qLote: rastro.qLote,
		dFab: rastro.dFab,
		dVal: rastro.dVal,
		cAgreg: rastro.cAgreg,
	}));
}

function rastrosParaApi(rastros: RastroItemLote[]): PedidoDavItemRastro[] {
	return rastros
		.filter((rastro) => rastro.nLote.trim() && rastro.qLote > 0)
		.map((rastro) => ({
			...(rastro.idlote ? { idlote: rastro.idlote } : {}),
			nLote: rastro.nLote.trim(),
			qLote: rastro.qLote,
			...(rastro.dFab ? { dFab: rastro.dFab } : {}),
			...(rastro.dVal ? { dVal: rastro.dVal } : {}),
			...(rastro.cAgreg ? { cAgreg: rastro.cAgreg } : {}),
		}));
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
	const [controlaLote, setControlaLote] = useState(false);
	const [unidademedida, setUnidademedida] = useState<string | undefined>();
	const [rastros, setRastros] = useState<RastroItemLote[]>([]);
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
			setUnidademedida(itemParaEditar.unidademedida ?? undefined);
			setRastros(rastrosParaUi(itemParaEditar.rastros));
			setControlaLote((itemParaEditar.rastros?.length ?? 0) > 0);

			if (itemParaEditar.idproduto) {
				void produtosService
					.buscar(itemParaEditar.idproduto)
					.then((produto) => {
						setControlaLote(produto.controlalote === 1);
						setUnidademedida(produto.unidademedida ?? undefined);
					})
					.catch(() => undefined);
			}
			return;
		}

		setIdproduto("");
		setBusca("");
		setQuantidade("1");
		setPreco("0.00");
		setControlaLote(false);
		setUnidademedida(undefined);
		setRastros([]);
		setTimeout(() => searchRef.current?.focus(), 100);
	}, [open, itemParaEditar]);

	async function selecionarProduto(produtoId: string) {
		setCarregandoProduto(true);
		try {
			const produto = await produtosService.buscar(produtoId);
			setIdproduto(produto.id);
			setBusca(formatarLabelProduto(produto));
			setPreco(normalizarPrecoProduto(produto.preco));
			setUnidademedida(produto.unidademedida ?? undefined);
			const controla =
				produto.controlalote === 1;
			setControlaLote(controla);
			setRastros([]);
		} finally {
			setCarregandoProduto(false);
		}
	}

	function handleConfirmar() {
		const qtd = parseFloat(quantidade.replace(",", "."));
		const valor = parseFloat(preco.replace(",", "."));
		if (!idproduto || !Number.isFinite(qtd) || qtd <= 0) return;
		if (!Number.isFinite(valor) || valor <= 0) return;

		if (controlaLote) {
			const rastrosValidos = rastrosParaApi(rastros);
			const soma = rastrosValidos.reduce(
				(total, rastro) => total + rastro.qLote,
				0,
			);
			if (rastrosValidos.length === 0) {
				toast.error("Informe ao menos um lote para este produto.");
				return;
			}
			if (Math.abs(soma - qtd) > 0.000001) {
				toast.error(
					"A soma das quantidades dos lotes deve fechar com a quantidade do item.",
				);
				return;
			}
			onConfirmar({
				idproduto,
				quantidade: qtd.toFixed(4),
				preco: valor.toFixed(6),
				unidademedida,
				rastros: rastrosValidos,
			});
			return;
		}

		onConfirmar({
			idproduto,
			quantidade: qtd.toFixed(4),
			preco: valor.toFixed(6),
			unidademedida,
			...(itemParaEditar ? { rastros: [] } : {}),
		});
	}

	const mostrarSugestoes =
		!idproduto &&
		!buscandoProdutos &&
		!carregandoProduto &&
		produtos.length > 0;

	const quantidadeNumero = parseFloat(quantidade.replace(",", ".")) || 0;

	return (
		<Dialog open={open} onOpenChange={(aberto) => !aberto && onClose()}>
			<DialogContent className="max-w-2xl gap-4 overflow-x-hidden sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{itemParaEditar ? "Editar item do pedido" : "Adicionar item ao pedido"}
					</DialogTitle>
				</DialogHeader>

				<div className="grid max-h-[70vh] gap-4 overflow-y-auto py-2">
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
										setControlaLote(false);
										setRastros([]);
										setUnidademedida(undefined);
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

					{controlaLote && idproduto ? (
						<BlocoLotesItemNfe
							item={{
								idproduto,
								quantidade: quantidadeNumero,
								rastros,
							}}
							idempresa={idempresa}
							onChange={setRastros}
						/>
					) : null}
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

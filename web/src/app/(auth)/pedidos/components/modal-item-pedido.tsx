"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	BlocoLotesItemNfe,
	type RastroItemLote,
} from "@/app/(auth)/nota-fiscal-venda/components/bloco-lotes-item-nfe";
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
import type {
	PedidoDavItem,
	PedidoDavItemRastro,
} from "@/services/dav.service";
import { produtosService } from "@/services/produtos.service";

type DadosItemPedido = {
	idproduto: string;
	quantidade: string;
	preco: string;
	desconto?: string;
	total?: string;
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
	quantidadesLocaisPorProduto?: Record<string, number>;
};

const formatarMoeda = (valor: string | number | null | undefined) => {
	const numero =
		typeof valor === "number" ? valor : parseFloat(String(valor ?? "0"));
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number.isFinite(numero) ? numero : 0);
};

const formatarQuantidade = (valor: number) =>
	new Intl.NumberFormat("pt-BR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 4,
	}).format(Number.isFinite(valor) ? valor : 0);

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
	quantidadesLocaisPorProduto,
}: ModalItemPedidoProps) {
	const searchRef = useRef<HTMLInputElement>(null);
	const [idproduto, setIdproduto] = useState("");
	const [busca, setBusca] = useState("");
	const [buscaDebounced, setBuscaDebounced] = useState("");
	const [quantidade, setQuantidade] = useState("1");
	const [preco, setPreco] = useState("0.00");
	const [desconto, setDesconto] = useState("0.00");
	const [estoqueAtual, setEstoqueAtual] = useState<number | null>(null);
	const [quantidadeProvisionada, setQuantidadeProvisionada] = useState<
		number | null
	>(null);
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
			setDesconto(normalizarPrecoProduto(itemParaEditar.desconto ?? "0"));
			setUnidademedida(itemParaEditar.unidademedida ?? undefined);
			setRastros(rastrosParaUi(itemParaEditar.rastros));
			setControlaLote((itemParaEditar.rastros?.length ?? 0) > 0);
			setEstoqueAtual(null);
			setQuantidadeProvisionada(null);

			if (itemParaEditar.idproduto) {
				void produtosService
					.buscar(itemParaEditar.idproduto)
					.then((produto) => {
						setControlaLote(produto.controlalote === 1);
						setUnidademedida(produto.unidademedida ?? undefined);
						const estoqueNum =
							produto.estoque ??
							(produto.quantidade != null ? Number(produto.quantidade) : 0);
						const provNum =
							produto.quantidadeProvisionada ??
							(produto.quantidadeprovisionada != null
								? Number(produto.quantidadeprovisionada)
								: 0);
						setEstoqueAtual(Number.isFinite(estoqueNum) ? estoqueNum : 0);
						setQuantidadeProvisionada(Number.isFinite(provNum) ? provNum : 0);
					})
					.catch(() => undefined);
			}
			return;
		}

		setIdproduto("");
		setBusca("");
		setQuantidade("1");
		setPreco("0.00");
		setDesconto("0.00");
		setEstoqueAtual(null);
		setQuantidadeProvisionada(null);
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
			setDesconto("0.00");
			setUnidademedida(produto.unidademedida ?? undefined);
			const estoqueNum =
				produto.estoque ??
				(produto.quantidade != null ? Number(produto.quantidade) : 0);
			const provNum =
				produto.quantidadeProvisionada ??
				(produto.quantidadeprovisionada != null
					? Number(produto.quantidadeprovisionada)
					: 0);
			setEstoqueAtual(Number.isFinite(estoqueNum) ? estoqueNum : 0);
			setQuantidadeProvisionada(Number.isFinite(provNum) ? provNum : 0);
			const controla = produto.controlalote === 1;
			setControlaLote(controla);
			setRastros([]);
		} finally {
			setCarregandoProduto(false);
		}
	}

	const quantidadeNumero = parseFloat(quantidade.replace(",", ".")) || 0;
	const precoNumero = parseFloat(preco.replace(",", ".")) || 0;
	const descontoNumero = Math.max(
		0,
		parseFloat(desconto.replace(",", ".")) || 0,
	);
	const valorBruto = Math.round(quantidadeNumero * precoNumero * 100) / 100;
	const valorLiquido = Math.max(
		0,
		Math.round((valorBruto - descontoNumero) * 100) / 100,
	);

	const provisionadoLocalExtra = idproduto
		? (quantidadesLocaisPorProduto?.[idproduto] ?? 0)
		: 0;
	const provisionadoTotal =
		quantidadeProvisionada != null
			? quantidadeProvisionada + provisionadoLocalExtra
			: null;
	const saldoPrevistoCalculado =
		estoqueAtual != null && provisionadoTotal != null
			? estoqueAtual - provisionadoTotal
			: null;

	function handleConfirmar() {
		const qtd = parseFloat(quantidade.replace(",", "."));
		const valor = parseFloat(preco.replace(",", "."));
		const desc = Math.max(0, parseFloat(desconto.replace(",", ".")) || 0);
		if (!idproduto || !Number.isFinite(qtd) || qtd <= 0) return;
		if (!Number.isFinite(valor) || valor <= 0) return;
		const bruto = Math.round(qtd * valor * 100) / 100;
		if (desc > bruto + 0.0001) {
			toast.error("O desconto do item não pode ser maior que o valor bruto.");
			return;
		}
		const liquido = Math.max(0, Math.round((bruto - desc) * 100) / 100);

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
				desconto: desc.toFixed(2),
				total: liquido.toFixed(2),
				unidademedida,
				rastros: rastrosValidos,
			});
			return;
		}

		onConfirmar({
			idproduto,
			quantidade: qtd.toFixed(4),
			preco: valor.toFixed(6),
			desconto: desc.toFixed(2),
			total: liquido.toFixed(2),
			unidademedida,
			...(itemParaEditar ? { rastros: [] } : {}),
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
						{itemParaEditar
							? "Editar item do pedido"
							: "Adicionar item ao pedido"}
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
										setDesconto("0.00");
										setEstoqueAtual(null);
										setQuantidadeProvisionada(null);
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
									? "Carregando dados do produto..."
									: "Buscando produtos..."}
							</p>
						)}

						{mostrarSugestoes && (
							<div className="max-h-72 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
								{produtos.map((produto) => {
									const est = Number(produto.quantidade ?? 0);
									const prov =
										Number(produto.quantidadeprovisionada ?? 0) +
										(quantidadesLocaisPorProduto?.[produto.id] ?? 0);
									const saldoPrev = est - prov;
									return (
										<button
											key={produto.id}
											type="button"
											className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
											onClick={() => void selecionarProduto(produto.id)}
										>
											<div className="min-w-0 flex-1">
												<div className="break-words font-medium">
													{formatarLabelProduto(produto)}
												</div>
												<div className="text-xs text-muted-foreground">
													Estoque: {formatarQuantidade(est)} · Provisionado:{" "}
													{formatarQuantidade(prov)} ·{" "}
													<span
														className={
															saldoPrev < 0
																? "font-medium text-destructive"
																: "font-medium text-foreground"
														}
													>
														Saldo previsto: {formatarQuantidade(saldoPrev)}
													</span>
												</div>
											</div>
											<span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
												{produto.preco ? formatarMoeda(produto.preco) : "—"}
											</span>
										</button>
									);
								})}
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

					{idproduto && saldoPrevistoCalculado !== null && (
						<div className="rounded-md border bg-muted/30 px-3 py-2.5">
							<div className="grid grid-cols-3 gap-2 text-xs">
								<div>
									<span className="block text-muted-foreground">
										Quantidade do produto
									</span>
									<span className="font-medium tabular-nums">
										{formatarQuantidade(estoqueAtual ?? 0)}{" "}
										{unidademedida ?? ""}
									</span>
								</div>
								<div>
									<span className="block text-muted-foreground">
										Provisionado em pedidos
									</span>
									<span className="font-medium tabular-nums">
										{formatarQuantidade(provisionadoTotal ?? 0)}{" "}
										{unidademedida ?? ""}
									</span>
								</div>
								<div>
									<span className="block text-muted-foreground">
										Saldo previsto
									</span>
									<span
										className={`font-semibold tabular-nums ${
											saldoPrevistoCalculado < 0 ? "text-destructive" : ""
										}`}
									>
										{formatarQuantidade(saldoPrevistoCalculado)}{" "}
										{unidademedida ?? ""}
									</span>
								</div>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

						<Field>
							<FieldLabel>Desconto (R$)</FieldLabel>
							<MoneyInput
								key={`desconto-${idproduto || "novo"}`}
								value={desconto}
								onChange={setDesconto}
								disabled={carregando || carregandoProduto}
							/>
						</Field>
					</div>

					<p className="text-right text-xs text-muted-foreground">
						Bruto {formatarMoeda(valorBruto)} · Desconto{" "}
						{formatarMoeda(descontoNumero)} ·{" "}
						<span className="font-medium text-foreground">
							Líquido {formatarMoeda(valorLiquido)}
						</span>
					</p>

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

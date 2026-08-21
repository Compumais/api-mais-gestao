"use client";

import { IconSearch, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	estoqueGestaoService,
	type SaldoEstoqueGestao,
} from "@/services/estoque-gestao.service";
import { produtosService } from "@/services/produtos.service";

export type TipoOperacaoAjuste = "entrada" | "saida" | "contagem";
export type TipoEstoqueAjuste = "0" | "1" | "2";

export type ItemAjusteEstoqueUi = {
	idproduto: string;
	codigoproduto: string | null;
	nomeproduto: string;
	quantidadeAtualOperacional: string;
	quantidadeAtualFiscal: string;
	quantidade: string;
};

type AjusteEstoqueDialogProps = {
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
	idempresa: string;
	produtosIniciais?: SaldoEstoqueGestao[];
	onSucesso: () => void;
};

function parseQtd(valor: string): number {
	const n = Number.parseFloat(valor.replace(",", "."));
	return Number.isNaN(n) ? 0 : n;
}

function formatarQtdExibicao(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "0";
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function quantidadePadraoParaItem(
	produto: SaldoEstoqueGestao,
	tipooperacao: TipoOperacaoAjuste,
	tipoestoque: TipoEstoqueAjuste,
): string {
	if (tipooperacao !== "contagem") return "";
	if (tipoestoque === "1") return produto.quantidadefiscal || "0";
	return produto.quantidade || "0";
}

function saldoParaItem(produto: SaldoEstoqueGestao): ItemAjusteEstoqueUi {
	return {
		idproduto: produto.idproduto,
		codigoproduto: produto.codigoproduto,
		nomeproduto: produto.nomeproduto ?? "Produto",
		quantidadeAtualOperacional: produto.quantidade || "0",
		quantidadeAtualFiscal: produto.quantidadefiscal || "0",
		quantidade: "",
	};
}

export function AjusteEstoqueDialog({
	aberto,
	onAbertoChange,
	idempresa,
	produtosIniciais = [],
	onSucesso,
}: AjusteEstoqueDialogProps) {
	const [tipooperacao, setTipooperacao] =
		useState<TipoOperacaoAjuste>("contagem");
	const [tipoestoque, setTipoestoque] = useState<TipoEstoqueAjuste>("2");
	const [observacao, setObservacao] = useState("");
	const [itens, setItens] = useState<ItemAjusteEstoqueUi[]>([]);
	const [busca, setBusca] = useState("");
	const [buscaAplicada, setBuscaAplicada] = useState("");

	useEffect(() => {
		if (!aberto) return;
		setTipooperacao("contagem");
		setTipoestoque("2");
		setObservacao("");
		setBusca("");
		setBuscaAplicada("");
		setItens(
			produtosIniciais.map((produto) => ({
				...saldoParaItem(produto),
				quantidade: quantidadePadraoParaItem(produto, "contagem", "2"),
			})),
		);
	}, [aberto, produtosIniciais]);

	const { data: produtosBusca, isFetching: buscandoProdutos } = useQuery({
		queryKey: ["ajuste-estoque-busca-produtos", idempresa, buscaAplicada],
		queryFn: () =>
			produtosService.listar({
				idempresa,
				q: buscaAplicada || undefined,
				tipo: "P",
				inativo: 0,
				page: 1,
				limit: 10,
			}),
		enabled: aberto && !!idempresa && buscaAplicada.length >= 1,
	});

	const idsJaIncluidos = useMemo(
		() => new Set(itens.map((item) => item.idproduto)),
		[itens],
	);

	const mutation = useMutation({
		mutationFn: () =>
			estoqueGestaoService.ajustarEmMassa({
				idempresa,
				tipooperacao,
				tipoestoque: Number(tipoestoque) as 0 | 1 | 2,
				observacao: observacao.trim() || null,
				itens: itens.map((item) => ({
					idproduto: item.idproduto,
					quantidade: String(parseQtd(item.quantidade)),
					nomeproduto: item.nomeproduto,
				})),
			}),
		onSuccess: (resultado) => {
			const falhas = resultado.resultados.filter((r) => !r.sucesso && r.mensagem);
			toast.success(
				`Ajuste concluído: ${resultado.movimentosRegistrados} movimento(s) em ${resultado.itensProcessados} produto(s)`,
			);
			if (falhas.length > 0) {
				toast.warning(
					`${falhas.length} item(ns) com aviso: ${falhas[0]?.mensagem ?? ""}`,
				);
			}
			onSucesso();
			onAbertoChange(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Falha ao ajustar estoque");
		},
	});

	function atualizarTipoOperacao(valor: TipoOperacaoAjuste) {
		setTipooperacao(valor);
		setItens((atual) =>
			atual.map((item) => ({
				...item,
				quantidade:
					valor === "contagem"
						? tipoestoque === "1"
							? item.quantidadeAtualFiscal
							: item.quantidadeAtualOperacional
						: "",
			})),
		);
	}

	function atualizarTipoEstoque(valor: TipoEstoqueAjuste) {
		setTipoestoque(valor);
		if (tipooperacao !== "contagem") return;
		setItens((atual) =>
			atual.map((item) => ({
				...item,
				quantidade:
					valor === "1"
						? item.quantidadeAtualFiscal
						: item.quantidadeAtualOperacional,
			})),
		);
	}

	function adicionarProduto(produto: {
		id: string;
		codigo: number | null;
		nome: string;
		descricao?: string;
	}) {
		if (idsJaIncluidos.has(produto.id)) {
			toast.message("Produto já está na lista");
			return;
		}

		estoqueGestaoService
			.listarSaldos({
				idempresa,
				busca: produto.codigo != null ? String(produto.codigo) : produto.nome,
				page: 1,
				limit: 20,
			})
			.then((resposta) => {
				const saldo =
					resposta.data.find((item) => item.idproduto === produto.id) ?? null;
				const base: ItemAjusteEstoqueUi = saldo
					? saldoParaItem(saldo)
					: {
							idproduto: produto.id,
							codigoproduto:
								produto.codigo != null ? String(produto.codigo) : null,
							nomeproduto: produto.descricao || produto.nome,
							quantidadeAtualOperacional: "0",
							quantidadeAtualFiscal: "0",
							quantidade: "",
						};
				setItens((atual) => [
					...atual,
					{
						...base,
						quantidade: quantidadePadraoParaItem(
							{
								id: null,
								idproduto: base.idproduto,
								idempresa,
								codigoproduto: base.codigoproduto,
								nomeproduto: base.nomeproduto,
								quantidade: base.quantidadeAtualOperacional,
								quantidadefiscal: base.quantidadeAtualFiscal,
								divergencia: "0",
								ncm: null,
								unidademedida: null,
								possuiSaldo: Boolean(saldo),
							},
							tipooperacao,
							tipoestoque,
						),
					},
				]);
				setBusca("");
				setBuscaAplicada("");
			})
			.catch(() => {
				toast.error("Não foi possível carregar o saldo do produto");
			});
	}

	function removerItem(idproduto: string) {
		setItens((atual) => atual.filter((item) => item.idproduto !== idproduto));
	}

	function atualizarQuantidade(idproduto: string, quantidade: string) {
		setItens((atual) =>
			atual.map((item) =>
				item.idproduto === idproduto ? { ...item, quantidade } : item,
			),
		);
	}

	const podeConfirmar =
		itens.length > 0 &&
		itens.every((item) => {
			const qtd = parseQtd(item.quantidade);
			if (tipooperacao === "contagem") return qtd >= 0 && item.quantidade.trim() !== "";
			return qtd > 0;
		}) &&
		!mutation.isPending;

	const labelQuantidade =
		tipooperacao === "contagem"
			? "Qtd. contada"
			: tipooperacao === "entrada"
				? "Qtd. entrada"
				: "Qtd. saída";

	return (
		<Dialog open={aberto} onOpenChange={onAbertoChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Ajuste de estoque</DialogTitle>
					<DialogDescription>
						Entrada e saída movimentam a quantidade informada. Contagem define o
						estoque final e calcula o acerto automaticamente.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1">
						<Label>Operação</Label>
						<Select
							value={tipooperacao}
							onValueChange={(v) =>
								atualizarTipoOperacao(v as TipoOperacaoAjuste)
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="contagem">Contagem</SelectItem>
								<SelectItem value="entrada">Entrada</SelectItem>
								<SelectItem value="saida">Saída</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label>Aplicar em</Label>
						<Select
							value={tipoestoque}
							onValueChange={(v) =>
								atualizarTipoEstoque(v as TipoEstoqueAjuste)
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="2">Operacional e fiscal</SelectItem>
								<SelectItem value="0">Somente operacional</SelectItem>
								<SelectItem value="1">Somente fiscal</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1 sm:col-span-2">
						<Label htmlFor="ajuste-obs">Observação</Label>
						<Input
							id="ajuste-obs"
							maxLength={50}
							value={observacao}
							onChange={(e) => setObservacao(e.target.value)}
							placeholder="Opcional"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="ajuste-busca">Adicionar produto</Label>
					<div className="flex gap-2">
						<div className="relative flex-1">
							<IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="ajuste-busca"
								className="pl-9"
								placeholder="Nome ou código"
								value={busca}
								onChange={(e) => setBusca(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										setBuscaAplicada(busca.trim());
									}
								}}
							/>
						</div>
						<Button
							type="button"
							variant="outline"
							onClick={() => setBuscaAplicada(busca.trim())}
						>
							Buscar
						</Button>
					</div>
					{buscaAplicada ? (
						<div className="max-h-40 overflow-y-auto rounded border">
							{buscandoProdutos ? (
								<p className="p-3 text-sm text-muted-foreground">
									Buscando...
								</p>
							) : (produtosBusca?.data ?? []).length === 0 ? (
								<p className="p-3 text-sm text-muted-foreground">
									Nenhum produto encontrado
								</p>
							) : (
								(produtosBusca?.data ?? []).map((produto) => (
									<button
										key={produto.id}
										type="button"
										className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50 disabled:opacity-50"
										disabled={idsJaIncluidos.has(produto.id)}
										onClick={() => adicionarProduto(produto)}
									>
										<span>
											{produto.codigo ?? "—"} — {produto.descricao || produto.nome}
										</span>
										{idsJaIncluidos.has(produto.id) ? (
											<span className="text-xs text-muted-foreground">
												Já incluso
											</span>
										) : null}
									</button>
								))
							)}
						</div>
					) : null}
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium">
							Produtos ({itens.length})
						</p>
						{itens.length > 0 ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setItens([])}
							>
								Limpar lista
							</Button>
						) : null}
					</div>

					{itens.length === 0 ? (
						<p className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
							Selecione produtos na grade de estoque ou busque acima para montar
							o ajuste em massa.
						</p>
					) : (
						<div className="max-h-72 space-y-2 overflow-y-auto rounded border p-2">
							{itens.map((item) => (
								<div
									key={item.idproduto}
									className="grid gap-2 rounded border p-3 sm:grid-cols-[1fr_7rem_auto]"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium">
											{item.codigoproduto ?? "—"} — {item.nomeproduto}
										</p>
										<p className="text-xs text-muted-foreground">
											Atual Op.{" "}
											{formatarQtdExibicao(item.quantidadeAtualOperacional)} ·
											Fiscal {formatarQtdExibicao(item.quantidadeAtualFiscal)}
										</p>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">{labelQuantidade}</Label>
										<Input
											value={item.quantidade}
											onChange={(e) =>
												atualizarQuantidade(item.idproduto, e.target.value)
											}
											inputMode="decimal"
										/>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="self-end"
										onClick={() => removerItem(item.idproduto)}
										aria-label="Remover produto"
									>
										<IconTrash className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onAbertoChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={!podeConfirmar}
						onClick={() => mutation.mutate()}
					>
						{mutation.isPending ? "Processando..." : "Confirmar ajuste"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

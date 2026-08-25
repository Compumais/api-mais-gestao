"use client";

import { Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { produtosService } from "@/services/produtos.service";

export type ItemCotacaoLocal = {
	idproduto?: string | null;
	descricao?: string | null;
	quantidade: string;
	unidademedida?: string | null;
	observacao?: string | null;
	nomeproduto?: string;
	codigoproduto?: number | null;
};

type ModalItemCotacaoProps = {
	open: boolean;
	onClose: () => void;
	onConfirmar: (dados: ItemCotacaoLocal) => void;
	idempresa: string;
	itemParaEditar?: ItemCotacaoLocal | null;
};

function formatarLabelProduto(produto: {
	codigo: number | null;
	descricao: string;
	nome: string;
}) {
	return `${produto.codigo ?? "—"} — ${produto.descricao || produto.nome}`;
}

export function ModalItemCotacao({
	open,
	onClose,
	onConfirmar,
	idempresa,
	itemParaEditar,
}: ModalItemCotacaoProps) {
	const searchRef = useRef<HTMLInputElement>(null);
	const [idproduto, setIdproduto] = useState("");
	const [busca, setBusca] = useState("");
	const [buscaDebounced, setBuscaDebounced] = useState("");
	const [quantidade, setQuantidade] = useState("1");
	const [unidademedida, setUnidademedida] = useState<string | null>(null);
	const [nomeproduto, setNomeproduto] = useState("");
	const [codigoproduto, setCodigoproduto] = useState<number | null>(null);
	const [carregandoProduto, setCarregandoProduto] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setBuscaDebounced(busca), 300);
		return () => window.clearTimeout(timer);
	}, [busca]);

	const { data: produtosData, isFetching: buscandoProdutos } = useQuery({
		queryKey: ["produtos-cotacao-busca", idempresa, buscaDebounced],
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
			setIdproduto(itemParaEditar.idproduto ?? "");
			setBusca(
				itemParaEditar.nomeproduto ||
					itemParaEditar.descricao ||
					"",
			);
			setQuantidade(itemParaEditar.quantidade);
			setUnidademedida(itemParaEditar.unidademedida ?? null);
			setNomeproduto(
				itemParaEditar.nomeproduto || itemParaEditar.descricao || "",
			);
			setCodigoproduto(itemParaEditar.codigoproduto ?? null);
			return;
		}

		setIdproduto("");
		setBusca("");
		setQuantidade("1");
		setUnidademedida(null);
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
			setUnidademedida(produto.unidademedida ?? null);
		} finally {
			setCarregandoProduto(false);
		}
	}

	const descricaoLivre = (nomeproduto || busca).trim();
	const qtd = parseFloat(quantidade.replace(",", "."));
	const podeConfirmar =
		Number.isFinite(qtd) &&
		qtd > 0 &&
		(Boolean(idproduto) || descricaoLivre.length >= 2);

	function handleConfirmar() {
		if (!podeConfirmar) return;
		onConfirmar({
			idproduto: idproduto || null,
			descricao: descricaoLivre,
			quantidade: String(qtd),
			unidademedida,
			nomeproduto: descricaoLivre,
			codigoproduto: idproduto ? codigoproduto : null,
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
						<FieldLabel>Produto</FieldLabel>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								ref={searchRef}
								className="pl-9"
								placeholder="Buscar no cadastro ou digitar um nome novo..."
								value={busca}
								disabled={carregandoProduto}
								onChange={(event) => {
									setBusca(event.target.value);
									setNomeproduto(event.target.value);
									if (idproduto) {
										setIdproduto("");
										setCodigoproduto(null);
										setUnidademedida(null);
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
						{!idproduto && busca.trim().length >= 2 && (
							<p className="px-1 text-xs text-muted-foreground">
								Não precisa estar cadastrado. Confirme para incluir “
								{busca.trim()}” nesta cotação.
							</p>
						)}
					</Field>

					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="quantidade-cotacao">Quantidade</FieldLabel>
							<Input
								id="quantidade-cotacao"
								type="number"
								min="0.0001"
								step="0.0001"
								value={quantidade}
								onChange={(event) => setQuantidade(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="um-cotacao">Unidade</FieldLabel>
							<Input
								id="um-cotacao"
								maxLength={6}
								placeholder="UN, KG..."
								value={unidademedida ?? ""}
								onChange={(event) =>
									setUnidademedida(event.target.value || null)
								}
							/>
						</Field>
					</div>
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

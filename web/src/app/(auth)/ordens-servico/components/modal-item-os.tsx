"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import { Textarea } from "@/components/ui/textarea";
import { cfopService } from "@/services/cfop.service";
import type { OrdemServicoItem } from "@/services/ordem-servico.service";
import { produtosService } from "@/services/produtos.service";

type ModalItemOsProps = {
	open: boolean;
	onClose: () => void;
	onConfirmar: (dados: {
		idproduto: string;
		quantidade: string;
		preco: string;
		idtecnico?: string;
		idcfop?: string;
		unidademedida?: string;
		observacao?: string;
	}) => void;
	idempresa: string;
	tipoEsperado: "P" | "S";
	itemParaEditar?: OrdemServicoItem | null;
	opcoesTecnicos: Array<{ value: string; label: string }>;
	tecnicoObrigatorio?: boolean;
	carregando?: boolean;
};

function formatarLabelProduto(produto: {
	codigo: number | null;
	descricao: string;
	nome: string;
}) {
	return `${produto.codigo ?? "—"} — ${produto.descricao || produto.nome}`;
}

function normalizarPreco(valor: string | null | undefined): string {
	const numero = parseFloat(String(valor ?? "").replace(",", "."));
	if (!Number.isFinite(numero) || numero < 0) return "0.00";
	return numero.toFixed(2);
}

export function ModalItemOs({
	open,
	onClose,
	onConfirmar,
	idempresa,
	tipoEsperado,
	itemParaEditar,
	opcoesTecnicos,
	tecnicoObrigatorio = false,
	carregando = false,
}: ModalItemOsProps) {
	const idBase = useId();
	const idBusca = `${idBase}-busca`;
	const idQtd = `${idBase}-qtd`;
	const idUn = `${idBase}-un`;
	const idObs = `${idBase}-obs`;
	const searchRef = useRef<HTMLInputElement>(null);
	const ehServico = tipoEsperado === "S";
	const rotuloEntidade = ehServico ? "serviço" : "produto";
	const [idproduto, setIdproduto] = useState("");
	const [busca, setBusca] = useState("");
	const [buscaDebounced, setBuscaDebounced] = useState("");
	const [quantidade, setQuantidade] = useState("1");
	const [preco, setPreco] = useState("0.00");
	const [idtecnico, setIdtecnico] = useState("");
	const [idcfop, setIdcfop] = useState("");
	const [unidademedida, setUnidademedida] = useState("");
	const [observacao, setObservacao] = useState("");
	const [carregandoProduto, setCarregandoProduto] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setBuscaDebounced(busca), 300);
		return () => window.clearTimeout(timer);
	}, [busca]);

	const { data: produtosData, isFetching: buscandoProdutos } = useQuery({
		queryKey: ["produtos-os-busca", idempresa, buscaDebounced, tipoEsperado],
		queryFn: () =>
			produtosService.listar({
				idempresa,
				q: buscaDebounced.trim() || undefined,
				page: 1,
				limit: 20,
				inativo: 0,
				tipo: tipoEsperado,
			}),
		enabled: open && !!idempresa,
	});

	const { data: cfops = [] } = useQuery({
		queryKey: ["cfops-os-item", idempresa],
		queryFn: () => cfopService.listarTodos({ idempresa, tipomovimento: "S" }),
		enabled: open && !!idempresa,
	});

	const produtos = produtosData?.data ?? [];

	useEffect(() => {
		if (!open) return;
		if (itemParaEditar) {
			setIdproduto(itemParaEditar.idproduto ?? "");
			setBusca(itemParaEditar.nomeproduto ?? "");
			setQuantidade(itemParaEditar.quantidade ?? "1");
			setPreco(normalizarPreco(itemParaEditar.preco));
			setIdtecnico(itemParaEditar.idtecnico ?? "");
			setIdcfop(itemParaEditar.idcfop ?? "");
			setUnidademedida(itemParaEditar.unidademedida ?? "");
			setObservacao(itemParaEditar.observacao ?? "");
			return;
		}
		setIdproduto("");
		setBusca("");
		setQuantidade("1");
		setPreco("0.00");
		setIdtecnico("");
		setIdcfop("");
		setUnidademedida("");
		setObservacao("");
		setTimeout(() => searchRef.current?.focus(), 100);
	}, [open, itemParaEditar]);

	async function selecionarProduto(produtoId: string) {
		setCarregandoProduto(true);
		try {
			const produto = await produtosService.buscar(produtoId);
			setIdproduto(produto.id);
			setBusca(formatarLabelProduto(produto));
			setPreco(normalizarPreco(produto.preco));
			setUnidademedida(produto.unidademedida ?? "");
		} finally {
			setCarregandoProduto(false);
		}
	}

	function confirmar() {
		if (!idproduto) return;
		if (tecnicoObrigatorio && !idtecnico) return;
		onConfirmar({
			idproduto,
			quantidade: quantidade.replace(",", "."),
			preco: preco.replace(",", "."),
			idtecnico: idtecnico || undefined,
			idcfop: idcfop || undefined,
			unidademedida: unidademedida || undefined,
			observacao: observacao || undefined,
		});
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{itemParaEditar
							? ehServico
								? "Editar serviço"
								: "Editar item"
							: ehServico
								? "Adicionar serviço"
								: "Adicionar item"}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<Field>
						<FieldLabel htmlFor={idBusca}>
							{ehServico ? "Serviço" : "Produto"}
						</FieldLabel>
						<div className="relative">
							<Input
								id={idBusca}
								ref={searchRef}
								value={busca}
								onChange={(e) => setBusca(e.target.value)}
								placeholder={`Buscar ${rotuloEntidade}...`}
								disabled={!!itemParaEditar}
							/>
							{(buscandoProdutos || carregandoProduto) && (
								<Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
							)}
						</div>
						{!itemParaEditar && produtos.length > 0 && !idproduto && (
							<div className="mt-1 max-h-40 overflow-y-auto rounded border">
								{produtos.map((produto) => (
									<button
										key={produto.id}
										type="button"
										className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
										onClick={() => void selecionarProduto(produto.id)}
									>
										{formatarLabelProduto(produto)}
									</button>
								))}
							</div>
						)}
					</Field>
					<div className="grid grid-cols-2 gap-3">
						<Field>
							<FieldLabel htmlFor={idQtd}>Quantidade</FieldLabel>
							<Input
								id={idQtd}
								value={quantidade}
								onChange={(e) => setQuantidade(e.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel>Preço</FieldLabel>
							<MoneyInput value={preco} onChange={setPreco} />
						</Field>
					</div>
					<Field>
						<FieldLabel>Técnico{tecnicoObrigatorio ? " *" : ""}</FieldLabel>
						<Combobox
							options={opcoesTecnicos}
							value={idtecnico}
							onChange={setIdtecnico}
							placeholder="Selecione o técnico"
							searchPlaceholder="Buscar..."
							emptyMessage="Nenhum técnico encontrado."
						/>
					</Field>
					<div className="grid grid-cols-2 gap-3">
						<Field>
							<FieldLabel>CFOP</FieldLabel>
							<Combobox
								options={cfops.map((cfop) => ({
									value: cfop.id,
									label: `${cfop.codigo ?? ""} — ${cfop.descricao ?? ""}`,
								}))}
								value={idcfop}
								onChange={setIdcfop}
								placeholder="Opcional"
								searchPlaceholder="Buscar CFOP..."
								emptyMessage="Nenhum CFOP encontrado."
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={idUn}>Unidade</FieldLabel>
							<Input
								id={idUn}
								value={unidademedida}
								onChange={(e) => setUnidademedida(e.target.value)}
								maxLength={6}
							/>
						</Field>
					</div>
					<Field>
						<FieldLabel htmlFor={idObs}>Observação</FieldLabel>
						<Textarea
							id={idObs}
							rows={2}
							value={observacao}
							onChange={(e) => setObservacao(e.target.value)}
						/>
					</Field>
				</div>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={confirmar}
						disabled={
							carregando || !idproduto || (tecnicoObrigatorio && !idtecnico)
						}
					>
						{carregando ? "Salvando..." : "Confirmar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

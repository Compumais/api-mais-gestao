"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CardapioPublicoProduto } from "@/services/cardapio-publico.service";
import {
	formatarMoeda,
	type ItemSacola,
	precoPizza,
} from "./tipos";

export function ProdutoDetalhe({
	produto,
	pizzas,
	cor,
	onFechar,
	onAdicionar,
}: {
	produto: CardapioPublicoProduto;
	pizzas: CardapioPublicoProduto[];
	cor: string;
	onFechar: () => void;
	onAdicionar: (item: ItemSacola) => void;
}) {
	const [qtd, setQtd] = useState(1);
	const [obs, setObs] = useState("");
	const [meio, setMeio] = useState<string | null>(null);
	const segundo = pizzas.find((p) => p.id === meio);
	const preco = segundo
		? precoPizza(produto.preco, segundo.preco)
		: produto.preco;
	const nome = segundo
		? `Pizza meio a meio: ${produto.descricao} / ${segundo.descricao}`
		: produto.descricao;

	return (
		<div>
			<div className="flex items-start justify-between gap-3">
				<h2 className="text-xl font-bold">{produto.descricao}</h2>
				<button type="button" onClick={onFechar} className="text-zinc-500">
					Fechar
				</button>
			</div>
			{produto.observacoes ? (
				<p className="mt-2 text-sm text-zinc-600">{produto.observacoes}</p>
			) : null}
			{produto.espizza === 1 ? (
				<div className="mt-4">
					<Label>Segundo sabor (opcional)</Label>
					<Select
						value={meio ?? "none"}
						onValueChange={(value) => setMeio(value === "none" ? null : value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Somente este sabor" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">Somente este sabor</SelectItem>
							{pizzas
								.filter((p) => p.id !== produto.id)
								.map((pizza) => (
									<SelectItem key={pizza.id} value={pizza.id}>
										{pizza.descricao} · {formatarMoeda(pizza.preco)}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>
			) : null}
			<div className="mt-4">
				<Label>Observação</Label>
				<Textarea value={obs} onChange={(event) => setObs(event.target.value)} />
			</div>
			<div className="mt-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={() => setQtd((n) => Math.max(1, n - 1))}
					>
						-
					</Button>
					<span className="w-6 text-center">{qtd}</span>
					<Button
						type="button"
						variant="outline"
						onClick={() => setQtd((n) => n + 1)}
					>
						+
					</Button>
				</div>
				<strong>{formatarMoeda(preco * qtd)}</strong>
			</div>
			<Button
				className="mt-5 w-full"
				style={{ background: cor }}
				onClick={() =>
					onAdicionar({
						chave: crypto.randomUUID(),
						idproduto: produto.id,
						idprodutomeio: meio,
						nome,
						preco,
						quantidade: qtd,
						observacao: obs,
					})
				}
			>
				Adicionar · {formatarMoeda(preco * qtd)}
			</Button>
		</div>
	);
}

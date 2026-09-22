"use client";

import type { CardapioPublicoProduto } from "@/services/cardapio-publico.service";
import { urlMidiaCardapio } from "@/services/cardapio-publico.service";
import { formatarMoeda } from "./tipos";

export function SecaoMaisPedidos({
	produtos,
	cor,
	onAdicionar,
}: {
	produtos: CardapioPublicoProduto[];
	cor: string;
	onAdicionar: (produto: CardapioPublicoProduto) => void;
}) {
	if (produtos.length === 0) return null;

	return (
		<section className="mt-5">
			<h2 className="text-lg font-bold" style={{ color: "#0a0a0a" }}>
				Os mais pedidos
			</h2>
			<ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
				{produtos.map((produto) => (
					<li key={produto.id} className="w-44 shrink-0">
						<article
							className="overflow-hidden rounded-xl border bg-white shadow-sm"
							style={{ borderColor: "#d4d4d4", color: "#0a0a0a" }}
						>
							{produto.imagemurl ? (
								<img
									src={urlMidiaCardapio(produto.imagemurl) ?? ""}
									alt=""
									className="aspect-square w-full object-cover"
								/>
							) : (
								<div
									className="flex aspect-square w-full items-center justify-center text-2xl font-black text-white"
									style={{ background: cor }}
								>
									{produto.descricao.slice(0, 1)}
								</div>
							)}
							<div className="p-3">
								<p className="line-clamp-2 text-xs font-bold tracking-wide uppercase">
									{produto.descricao}
								</p>
								<p className="mt-1 text-sm font-bold">
									{formatarMoeda(produto.preco)}
								</p>
								<button
									type="button"
									onClick={() => onAdicionar(produto)}
									className="mt-2 w-full rounded-md bg-neutral-950 py-2 text-[11px] font-bold tracking-wide text-white uppercase"
								>
									Adicionar
								</button>
							</div>
						</article>
					</li>
				))}
			</ul>
		</section>
	);
}

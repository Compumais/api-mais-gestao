"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	type CardapioPublicoProduto,
	cardapioPublicoService,
	urlMidiaCardapio,
} from "@/services/cardapio-publico.service";
import { CardapioPublicoCheckout } from "./cardapio-publico/checkout";
import { ProdutoDetalhe } from "./cardapio-publico/produto-detalhe";
import { CardapioPublicoSucesso } from "./cardapio-publico/sucesso";
import { formatarMoeda, type ItemSacola, type PedidoSucesso } from "./cardapio-publico/tipos";
import { resolverTaxaEntregaLocal } from "./totais-cardapio";

export function CardapioPublicoClient({ slug }: { slug: string }) {
	const { data, isLoading, error } = useQuery({
		queryKey: ["cardapio-publico", slug],
		queryFn: () => cardapioPublicoService.buscar(slug),
	});

	const [grupoAtivo, setGrupoAtivo] = useState<string | "todos">("todos");
	const [sacola, setSacola] = useState<ItemSacola[]>([]);
	const [produtoAberto, setProdutoAberto] = useState<CardapioPublicoProduto | null>(
		null,
	);
	const [view, setView] = useState<"menu" | "checkout" | "sucesso">("menu");
	const [nome, setNome] = useState("");
	const [telefone, setTelefone] = useState("");
	const [respostas, setRespostas] = useState<Record<string, string>>({});
	const [pedidoOk, setPedidoOk] = useState<PedidoSucesso | null>(null);

	const cor = data?.corprimaria || "#c2410c";
	const pizzas = useMemo(
		() => (data?.produtos ?? []).filter((p) => p.espizza === 1),
		[data],
	);

	const produtosFiltrados = useMemo(() => {
		const lista = data?.produtos ?? [];
		if (grupoAtivo === "todos") return lista;
		return lista.filter((p) => p.idgrupogourmet === grupoAtivo);
	}, [data, grupoAtivo]);

	const subtotal = sacola.reduce(
		(acc, item) => acc + item.preco * item.quantidade,
		0,
	);
	const modalidade = (respostas.modalidade || "delivery") as
		| "delivery"
		| "retirada";
	const taxa = data
		? resolverTaxaEntregaLocal({
				modalidade:
					data.habilitadelivery === 1 && data.habilitaretirada !== 1
						? "delivery"
						: data.habilitaretirada === 1 && data.habilitadelivery !== 1
							? "retirada"
							: modalidade,
				bairro: respostas.bairro,
				taxaPadrao: data.taxaentregapadrao,
				bairros: data.bairrosentrega,
			})
		: 0;
	const total = subtotal + taxa;
	const qtdItens = sacola.reduce((acc, item) => acc + item.quantidade, 0);

	const { mutate: enviar, isPending } = useMutation({
		mutationFn: async () => {
			if (!data) throw new Error("Cardápio indisponível");
			if (nome.trim().length < 2) throw new Error("Informe seu nome");
			if (telefone.replace(/\D/g, "").length < 10) {
				throw new Error("Informe um telefone com DDD");
			}
			return cardapioPublicoService.enviarPedido(slug, {
				clientorderid: crypto.randomUUID(),
				nomecliente: nome,
				telefone,
				respostas: Object.entries(respostas).map(([campoid, valor]) => ({
					campoid,
					valor,
				})),
				itens: sacola.map((item) => ({
					idproduto: item.idproduto,
					quantidade: item.quantidade,
					observacao: item.observacao || null,
					idprodutomeio: item.idprodutomeio,
				})),
			});
		},
		onSuccess: (pedido) => {
			setPedidoOk({
				protocolo: pedido.protocolo,
				total: pedido.total,
				pixCopiaCola: pedido.pixCopiaCola,
				chavepix: pedido.chavepix,
			});
			setSacola([]);
			setView("sucesso");
		},
		onError: (err: Error) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<div className="flex min-h-svh items-center justify-center bg-zinc-50">
				<div
					className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
					style={{ borderColor: cor, borderTopColor: "transparent" }}
				/>
			</div>
		);
	}

	if (error || !data) {
		return (
			<main className="flex min-h-svh items-center justify-center bg-zinc-50 p-6">
				<section className="max-w-md rounded-xl border bg-white p-6 text-center">
					<h1 className="text-xl font-semibold">Cardápio indisponível</h1>
					<p className="mt-2 text-sm text-zinc-500">
						Este link é inválido ou o cardápio está desativado.
					</p>
				</section>
			</main>
		);
	}

	if (!data.aberto && view !== "sucesso") {
		return (
			<main className="flex min-h-svh items-center justify-center bg-zinc-50 p-6">
				<section className="max-w-md rounded-xl border bg-white p-6 text-center">
					<h1 className="text-xl font-semibold">{data.nome}</h1>
					<p className="mt-2 text-sm text-zinc-600">{data.mensagemhorario}</p>
				</section>
			</main>
		);
	}

	return (
		<div className="min-h-svh bg-zinc-50 pb-28" style={{ ["--brand" as string]: cor }}>
			{view === "menu" && (
				<>
					<header className="relative">
						{data.bannerurl ? (
							<img
								src={urlMidiaCardapio(data.bannerurl) ?? ""}
								alt=""
								className="h-44 w-full object-cover sm:h-56"
							/>
						) : (
							<div className="h-44 w-full sm:h-56" style={{ background: cor }} />
						)}
						<div className="absolute inset-x-0 -bottom-10 flex justify-center">
							<div className="flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow">
								{data.logourl ? (
									<img
										src={urlMidiaCardapio(data.logourl) ?? ""}
										alt={data.nome}
										className="size-full object-cover"
									/>
								) : (
									<span className="text-lg font-bold" style={{ color: cor }}>
										{data.nome.slice(0, 1)}
									</span>
								)}
							</div>
						</div>
					</header>
					<main className="mx-auto max-w-3xl px-4 pt-14">
						<h1 className="text-center text-2xl font-bold">{data.nome}</h1>
						{data.tempomedioentrega ? (
							<p className="mt-1 text-center text-sm text-zinc-500">
								Entrega em {data.tempomedioentrega}
							</p>
						) : null}
						<nav className="sticky top-0 z-10 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-zinc-50/95 px-4 py-3 backdrop-blur">
							<button
								type="button"
								onClick={() => setGrupoAtivo("todos")}
								className="rounded-full px-4 py-1.5 text-sm font-medium"
								style={
									grupoAtivo === "todos"
										? { background: cor, color: "white" }
										: { background: "white" }
								}
							>
								Todos
							</button>
							{data.grupos.map((grupo) => (
								<button
									key={grupo.id}
									type="button"
									onClick={() => setGrupoAtivo(grupo.id)}
									className="rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap"
									style={
										grupoAtivo === grupo.id
											? { background: cor, color: "white" }
											: { background: "white" }
									}
								>
									{grupo.nome}
								</button>
							))}
						</nav>
						<ul className="mt-4 space-y-3">
							{produtosFiltrados.map((produto) => (
								<li key={produto.id}>
									<button
										type="button"
										onClick={() => setProdutoAberto(produto)}
										className="flex w-full gap-3 rounded-2xl bg-white p-3 text-left shadow-sm"
									>
										{produto.imagemurl ? (
											<img
												src={urlMidiaCardapio(produto.imagemurl) ?? ""}
												alt=""
												className="size-20 rounded-xl object-cover"
											/>
										) : (
											<div
												className="size-20 rounded-xl"
												style={{ background: `${cor}22` }}
											/>
										)}
										<div className="min-w-0 flex-1">
											<p className="font-semibold">{produto.descricao}</p>
											{produto.observacoes ? (
												<p className="mt-1 line-clamp-2 text-sm text-zinc-500">
													{produto.observacoes}
												</p>
											) : null}
											<p className="mt-2 font-medium" style={{ color: cor }}>
												{formatarMoeda(produto.preco)}
											</p>
										</div>
									</button>
								</li>
							))}
						</ul>
					</main>
				</>
			)}

			{view === "checkout" && (
				<CardapioPublicoCheckout
					data={data}
					sacola={sacola}
					nome={nome}
					telefone={telefone}
					respostas={respostas}
					subtotal={subtotal}
					taxa={taxa}
					total={total}
					cor={cor}
					enviando={isPending}
					onVoltar={() => setView("menu")}
					onNome={setNome}
					onTelefone={setTelefone}
					onRespostas={setRespostas}
					onRemover={(chave) =>
						setSacola((atual) => atual.filter((linha) => linha.chave !== chave))
					}
					onEnviar={() => enviar()}
				/>
			)}

			{view === "sucesso" && pedidoOk ? (
				<CardapioPublicoSucesso
					pedido={pedidoOk}
					onNovoPedido={() => setView("menu")}
				/>
			) : null}

			{produtoAberto ? (
				<div className="fixed inset-0 z-40 flex items-end bg-black/40 sm:items-center sm:justify-center">
					<section className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl">
						<ProdutoDetalhe
							produto={produtoAberto}
							pizzas={pizzas}
							cor={cor}
							onFechar={() => setProdutoAberto(null)}
							onAdicionar={(item) => {
								setSacola((atual) => [...atual, item]);
								setProdutoAberto(null);
							}}
						/>
					</section>
				</div>
			) : null}

			{view === "menu" && qtdItens > 0 ? (
				<div className="fixed inset-x-0 bottom-0 z-30 p-4">
					<button
						type="button"
						onClick={() => {
							const padrao =
								data.habilitadelivery === 1 ? "delivery" : "retirada";
							setRespostas((atual) => ({
								...atual,
								modalidade: atual.modalidade || padrao,
							}));
							setView("checkout");
						}}
						className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-2xl px-5 py-4 text-white shadow-lg"
						style={{ background: cor }}
					>
						<span className="font-semibold">Finalizar</span>
						<span>
							{qtdItens} {qtdItens === 1 ? "item" : "itens"} ·{" "}
							{formatarMoeda(subtotal)}
						</span>
					</button>
				</div>
			) : null}
		</div>
	);
}

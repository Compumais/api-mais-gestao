"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Bike,
	Clock,
	Home,
	Minus,
	Plus,
	Search,
	Share2,
	ShoppingCart,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	type CardapioPublicoProduto,
	cardapioPublicoService,
	type MeuPedidoCardapio,
	urlMidiaCardapio,
} from "@/services/cardapio-publico.service";
import { CardapioPublicoCheckout } from "./cardapio-publico/checkout";
import { ProdutoDetalhe } from "./cardapio-publico/produto-detalhe";
import { SecaoMaisPedidos } from "./cardapio-publico/secao-mais-pedidos";
import { SecaoMeusPedidos } from "./cardapio-publico/secao-meus-pedidos";
import { CardapioPublicoSucesso } from "./cardapio-publico/sucesso";
import {
	formatarMoeda,
	type ItemSacola,
	type PedidoSucesso,
} from "./cardapio-publico/tipos";
import { resolverTaxaEntregaLocal } from "./totais-cardapio";

export function CardapioPublicoClient({ slug }: { slug: string }) {
	const { data, isLoading, error } = useQuery({
		queryKey: ["cardapio-publico", slug],
		queryFn: () => cardapioPublicoService.buscar(slug),
	});

	const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null);
	const [busca, setBusca] = useState("");
	const [sacola, setSacola] = useState<ItemSacola[]>([]);
	const [produtoAberto, setProdutoAberto] =
		useState<CardapioPublicoProduto | null>(null);
	const [view, setView] = useState<"menu" | "checkout" | "sucesso">("menu");
	const [nome, setNome] = useState("");
	const [telefone, setTelefone] = useState("");
	const [telefoneConsulta, setTelefoneConsulta] = useState("");
	const [respostas, setRespostas] = useState<Record<string, string>>({});
	const [pedidoOk, setPedidoOk] = useState<PedidoSucesso | null>(null);

	useEffect(() => {
		const local = cardapioPublicoService.lerClienteLocal(slug);
		if (local.nome) setNome(local.nome);
		if (local.telefone) {
			setTelefone(local.telefone);
			setTelefoneConsulta(local.telefone);
		}
	}, [slug]);

	useEffect(() => {
		if (!data?.grupos.length) return;
		setGrupoAtivo((atual) => {
			if (atual && data.grupos.some((grupo) => grupo.id === atual)) {
				return atual;
			}
			return data.grupos[0]?.id ?? null;
		});
	}, [data]);

	const digitosConsulta = telefoneConsulta.replace(/\D/g, "");
	const {
		data: meusPedidos = [],
		isFetching: carregandoMeusPedidos,
		refetch: refetchMeusPedidos,
	} = useQuery({
		queryKey: ["cardapio-meus-pedidos", slug, digitosConsulta],
		queryFn: () =>
			cardapioPublicoService.listarMeusPedidos(slug, digitosConsulta),
		enabled: digitosConsulta.length >= 10,
	});

	const cor = data?.corprimaria || "#111111";
	const pizzas = useMemo(
		() => (data?.produtos ?? []).filter((p) => p.espizza === 1),
		[data],
	);
	const produtosPorId = useMemo(() => {
		const mapa = new Map<string, CardapioPublicoProduto>();
		for (const produto of data?.produtos ?? []) {
			mapa.set(produto.id, produto);
		}
		return mapa;
	}, [data]);

	const produtosFiltrados = useMemo(() => {
		const termo = busca.trim().toLowerCase();
		return (data?.produtos ?? []).filter((produto) => {
			if (grupoAtivo && produto.idgrupogourmet !== grupoAtivo) return false;
			if (!termo) return true;
			return (
				produto.descricao.toLowerCase().includes(termo) ||
				(produto.observacoes ?? "").toLowerCase().includes(termo)
			);
		});
	}, [data, grupoAtivo, busca]);

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

	const quantidadeDoProduto = (idproduto: string) =>
		sacola
			.filter((item) => item.idproduto === idproduto && !item.idprodutomeio)
			.reduce((acc, item) => acc + item.quantidade, 0);

	const alterarQuantidadeSimples = (
		produto: CardapioPublicoProduto,
		delta: number,
	) => {
		if (produto.espizza === 1) {
			setProdutoAberto(produto);
			return;
		}
		setSacola((atual) => {
			const indice = atual.findIndex(
				(item) => item.idproduto === produto.id && !item.idprodutomeio,
			);
			if (indice < 0) {
				if (delta <= 0) return atual;
				return [
					...atual,
					{
						chave: crypto.randomUUID(),
						idproduto: produto.id,
						idprodutomeio: null,
						nome: produto.descricao,
						preco: produto.preco,
						quantidade: 1,
						observacao: "",
					},
				];
			}
			const copia = [...atual];
			const linha = copia[indice];
			if (!linha) return atual;
			const proxima = linha.quantidade + delta;
			if (proxima <= 0) {
				copia.splice(indice, 1);
				return copia;
			}
			copia[indice] = { ...linha, quantidade: proxima };
			return copia;
		});
	};

	const adicionarProdutoRapido = (produto: CardapioPublicoProduto) => {
		if (produto.espizza === 1) {
			setProdutoAberto(produto);
			return;
		}
		alterarQuantidadeSimples(produto, 1);
		toast.success(`${produto.descricao} adicionado`);
	};

	const pedirNovamente = (pedido: MeuPedidoCardapio) => {
		const novos: ItemSacola[] = [];
		let ignorados = 0;
		for (const item of pedido.itens) {
			const produto = produtosPorId.get(item.idproduto);
			if (!produto) {
				ignorados += 1;
				continue;
			}
			const segundo = item.idprodutomeio
				? produtosPorId.get(item.idprodutomeio)
				: null;
			const preco = segundo
				? Math.max(produto.preco, segundo.preco)
				: produto.preco;
			const nomeItem = segundo
				? `Pizza meio a meio: ${produto.descricao} / ${segundo.descricao}`
				: produto.descricao;
			novos.push({
				chave: crypto.randomUUID(),
				idproduto: produto.id,
				idprodutomeio: item.idprodutomeio,
				nome: nomeItem,
				preco,
				quantidade: item.quantidade,
				observacao: "",
			});
		}
		if (novos.length === 0) {
			toast.error("Nenhum item deste pedido está disponível no cardápio");
			return;
		}
		setSacola((atual) => [...atual, ...novos]);
		if (ignorados > 0) {
			toast.message(
				`${novos.length} item(ns) adicionados; ${ignorados} indisponível(is)`,
			);
		} else {
			toast.success("Itens adicionados ao carrinho");
		}
		abrirCheckout();
	};

	const abrirCheckout = () => {
		if (!data) return;
		const padrao = data.habilitadelivery === 1 ? "delivery" : "retirada";
		setRespostas((atual) => ({
			...atual,
			modalidade: atual.modalidade || padrao,
		}));
		setView("checkout");
	};

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
			cardapioPublicoService.salvarClienteLocal(slug, nome, telefone);
			setTelefoneConsulta(telefone.replace(/\D/g, ""));
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
			<div className="flex min-h-svh items-center justify-center bg-neutral-100">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-900 border-t-transparent" />
			</div>
		);
	}

	if (error || !data) {
		return (
			<main className="flex min-h-svh items-center justify-center bg-neutral-100 p-6">
				<section className="max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center">
					<h1 className="text-xl font-bold text-neutral-950">
						Cardápio indisponível
					</h1>
					<p className="mt-2 text-sm text-neutral-700">
						Este link é inválido ou o cardápio está desativado.
					</p>
				</section>
			</main>
		);
	}

	if (!data.aberto && view !== "sucesso") {
		return (
			<main className="flex min-h-svh items-center justify-center bg-neutral-100 p-6">
				<section className="max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center">
					<h1 className="text-xl font-bold text-neutral-950">{data.nome}</h1>
					<p className="mt-2 text-sm text-neutral-700">
						{data.mensagemhorario}
					</p>
				</section>
			</main>
		);
	}

	const grupoAtualNome =
		data.grupos.find((grupo) => grupo.id === grupoAtivo)?.nome ?? "Cardápio";

	return (
		<div
			className="min-h-svh pb-24"
			style={{ color: "#0a0a0a", backgroundColor: "#f5f5f5" }}
		>
			{view === "menu" && (
				<>
					<header className="border-b border-neutral-200 bg-[#f3ebe0]">
						<div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-5">
							<div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-neutral-900 bg-white">
								{data.logourl ? (
									<img
										src={urlMidiaCardapio(data.logourl) ?? ""}
										alt={data.nome}
										className="size-full object-cover"
									/>
								) : (
									<span className="text-xl font-black uppercase">
										{data.nome.slice(0, 1)}
									</span>
								)}
							</div>
							<div className="min-w-0">
								<h1 className="truncate text-2xl font-black tracking-tight uppercase">
									{data.nome}
								</h1>
								{data.tempomedioentrega ? (
									<p className="mt-0.5 text-sm font-medium text-neutral-700">
										Delivery · {data.tempomedioentrega}
									</p>
								) : (
									<p className="mt-0.5 text-sm font-medium text-neutral-700">
										Cardápio delivery
									</p>
								)}
							</div>
						</div>
					</header>

					<main className="mx-auto max-w-3xl px-4 pt-4">
						<div className="flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
								<span className="size-1.5 rounded-full bg-emerald-600" />
								Aberto
							</span>
							{data.tempomedioentrega ? (
								<span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-900">
									<Clock className="size-3.5" aria-hidden />
									{data.tempomedioentrega}
								</span>
							) : null}
							{data.habilitadelivery === 1 ? (
								<span className="inline-flex items-center gap-1.5 rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-950">
									<Bike className="size-3.5" aria-hidden />
									Entrega {formatarMoeda(data.taxaentregapadrao)}
								</span>
							) : null}
							<div className="ml-auto flex items-center gap-1">
								<button
									type="button"
									className="rounded-md p-2 text-neutral-900 hover:bg-neutral-200"
									aria-label="Buscar"
									onClick={() =>
										document.getElementById("busca-cardapio")?.focus()
									}
								>
									<Search className="size-5" />
								</button>
								<button
									type="button"
									className="rounded-md p-2 text-neutral-900 hover:bg-neutral-200"
									aria-label="Compartilhar"
									onClick={async () => {
										try {
											await navigator.share?.({
												title: data.nome,
												url: window.location.href,
											});
										} catch {
											await navigator.clipboard.writeText(window.location.href);
											toast.success("Link copiado");
										}
									}}
								>
									<Share2 className="size-5" />
								</button>
							</div>
						</div>

						<label className="relative mt-4 block">
							<span className="sr-only">Buscar no cardápio</span>
							<Search
								className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-600"
								aria-hidden
							/>
							<input
								id="busca-cardapio"
								value={busca}
								onChange={(event) => setBusca(event.target.value)}
								placeholder="Buscar no cardápio..."
								className="w-full rounded-xl border border-neutral-300 bg-white py-3 pr-10 pl-10 text-sm font-medium text-neutral-950 placeholder:text-neutral-500 outline-none focus:border-neutral-900"
							/>
							{busca ? (
								<button
									type="button"
									className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-neutral-700"
									aria-label="Limpar busca"
									onClick={() => setBusca("")}
								>
									<X className="size-4" />
								</button>
							) : null}
						</label>

						{!busca ? (
							<>
								<SecaoMaisPedidos
									produtos={data.maisPedidos ?? []}
									cor={cor}
									onAdicionar={adicionarProdutoRapido}
								/>
								<SecaoMeusPedidos
									pedidos={meusPedidos}
									carregando={carregandoMeusPedidos}
									telefone={telefoneConsulta}
									onTelefone={setTelefoneConsulta}
									onBuscar={() => {
										const digitos = telefoneConsulta.replace(/\D/g, "");
										if (digitos.length < 10) {
											toast.error("Informe um telefone com DDD");
											return;
										}
										setTelefone(digitos);
										void refetchMeusPedidos();
									}}
									onPedirNovamente={pedirNovamente}
								/>
							</>
						) : null}

						<nav
							className="sticky top-0 z-10 -mx-4 mt-4 flex gap-5 overflow-x-auto border-b border-neutral-300 bg-neutral-100/95 px-4 backdrop-blur"
							aria-label="Grupos gourmet"
						>
							{data.grupos.length === 0 ? (
								<p className="py-3 text-sm font-medium text-neutral-700">
									Nenhum grupo gourmet cadastrado
								</p>
							) : (
								data.grupos.map((grupo) => {
									const ativo = grupoAtivo === grupo.id;
									return (
										<button
											key={grupo.id}
											type="button"
											onClick={() => setGrupoAtivo(grupo.id)}
											className={`shrink-0 border-b-2 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
												ativo
													? "border-neutral-950 text-neutral-950"
													: "border-transparent text-neutral-600 hover:text-neutral-900"
											}`}
										>
											{grupo.nome}
										</button>
									);
								})
							)}
						</nav>

						<section className="mt-5 pb-6">
							<h2 className="text-lg font-bold text-neutral-950">
								{busca ? "Resultados" : grupoAtualNome}
							</h2>

							{produtosFiltrados.length === 0 ? (
								<p className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm font-medium text-neutral-700">
									Nenhum produto neste grupo gourmet. Vincule produtos a um
									grupo em Cadastros → Produtos.
								</p>
							) : (
								<ul className="mt-4 space-y-3">
									{produtosFiltrados.map((produto) => {
										const qtd = quantidadeDoProduto(produto.id);
										return (
											<li key={produto.id}>
												<article className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
													<button
														type="button"
														className="shrink-0"
														onClick={() => setProdutoAberto(produto)}
														aria-label={`Ver ${produto.descricao}`}
													>
														{produto.imagemurl ? (
															<img
																src={urlMidiaCardapio(produto.imagemurl) ?? ""}
																alt=""
																className="size-24 rounded-lg object-cover"
															/>
														) : (
															<div
																className="flex size-24 items-center justify-center rounded-lg text-lg font-black text-white"
																style={{ background: cor }}
															>
																{produto.descricao.slice(0, 1)}
															</div>
														)}
													</button>
													<div className="flex min-w-0 flex-1 flex-col">
														<button
															type="button"
															className="text-left"
															onClick={() => setProdutoAberto(produto)}
														>
															<p className="line-clamp-2 text-sm font-bold tracking-wide text-neutral-950 uppercase">
																{produto.descricao}
															</p>
															{produto.observacoes ? (
																<p className="mt-1 line-clamp-2 text-xs font-medium text-neutral-600">
																	{produto.observacoes}
																</p>
															) : null}
															<p className="mt-2 text-base font-bold text-neutral-950">
																{formatarMoeda(produto.preco)}
															</p>
														</button>
														<div className="mt-auto flex items-center justify-end gap-2 pt-2">
															{produto.espizza === 1 ? (
																<button
																	type="button"
																	onClick={() => setProdutoAberto(produto)}
																	className="rounded-md bg-neutral-950 px-4 py-2 text-xs font-bold tracking-wide text-white uppercase"
																>
																	Adicionar
																</button>
															) : (
																<>
																	<button
																		type="button"
																		aria-label="Diminuir quantidade"
																		className="flex size-8 items-center justify-center rounded-md border border-neutral-300 text-neutral-950"
																		onClick={() =>
																			alterarQuantidadeSimples(produto, -1)
																		}
																	>
																		<Minus className="size-4" />
																	</button>
																	<input
																		readOnly
																		value={qtd}
																		aria-label="Quantidade"
																		className="h-8 w-10 rounded-md border border-neutral-300 bg-white text-center text-sm font-bold text-neutral-950"
																	/>
																	<button
																		type="button"
																		aria-label="Aumentar quantidade"
																		className="flex size-8 items-center justify-center rounded-md border border-neutral-300 text-neutral-950"
																		onClick={() =>
																			alterarQuantidadeSimples(produto, 1)
																		}
																	>
																		<Plus className="size-4" />
																	</button>
																</>
															)}
														</div>
													</div>
												</article>
											</li>
										);
									})}
								</ul>
							)}
						</section>
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
				<div className="fixed inset-0 z-40 flex items-end bg-black/50 sm:items-center sm:justify-center">
					<section className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 text-neutral-950 sm:max-w-md sm:rounded-3xl">
						<ProdutoDetalhe
							produto={produtoAberto}
							pizzas={pizzas}
							cor="#111111"
							onFechar={() => setProdutoAberto(null)}
							onAdicionar={(item) => {
								setSacola((atual) => [...atual, item]);
								setProdutoAberto(null);
							}}
						/>
					</section>
				</div>
			) : null}

			{view !== "sucesso" ? (
				<nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-300 bg-white">
					<div className="mx-auto grid max-w-3xl grid-cols-2">
						<button
							type="button"
							onClick={() => setView("menu")}
							className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold ${
								view === "menu" ? "text-neutral-950" : "text-neutral-500"
							}`}
						>
							<Home className="size-5" aria-hidden />
							Início
						</button>
						<button
							type="button"
							onClick={() => {
								if (qtdItens === 0) {
									toast.message("Adicione itens ao carrinho");
									return;
								}
								abrirCheckout();
							}}
							className={`relative flex flex-col items-center gap-1 py-3 text-xs font-semibold ${
								view === "checkout" ? "text-neutral-950" : "text-neutral-500"
							}`}
						>
							<ShoppingCart className="size-5" aria-hidden />
							Carrinho
							{qtdItens > 0 ? (
								<span className="absolute top-2 right-[calc(50%-28px)] flex size-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] font-bold text-white">
									{qtdItens}
								</span>
							) : null}
						</button>
					</div>
				</nav>
			) : null}
		</div>
	);
}

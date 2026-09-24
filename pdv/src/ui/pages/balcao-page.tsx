import {
	ArrowLeft,
	MessageSquareText,
	Minus,
	Plus,
	ShoppingCart,
	Tag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { marcarBootPendente } from "@/lib/boot-state";
import {
	ESTADO_BUSCA_PRODUTOS_VAZIO,
	type EstadoBuscaProdutos,
	obterModoCatalogoProdutos,
} from "@/lib/catalogo-produtos";
import { normalizarObservacaoItem } from "@/lib/observacao-item";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	type GrupoLocal,
	type LeituraCodigoBarras,
	type ProdutoLocal,
	rotuloModelo,
	type StatusContext,
} from "@/lib/pdv-types";
import { produtoEhPizza } from "@/lib/pizza-meio-a-meio";
import { devePedirPeso, formatarQuantidade } from "@/lib/produto-kg";
import { teclaCorresponde } from "@/lib/teclas-funcao";
import { money } from "@/lib/utils";
import {
	AvisoSecundario,
	secundarioDesconectado,
} from "@/ui/components/aviso-secundario";
import { BarcodeInput } from "@/ui/components/barcode-input";
import { DialogFecharCaixa } from "@/ui/components/dialog-fechar-caixa";
import { DialogObservacaoItem } from "@/ui/components/dialog-observacao-item";
import {
	DialogPagamentoMisto,
	type FechamentoMisto,
} from "@/ui/components/dialog-pagamento-misto";
import {
	DialogPizzaMeioAMeio,
	type ItemPizzaMeioAMeio,
} from "@/ui/components/dialog-pizza-meio-a-meio";
import { DialogQuantidadePeso } from "@/ui/components/dialog-quantidade-peso";
import { DialogRejeicaoNfce } from "@/ui/components/dialog-rejeicao-nfce";
import { FunctionBar } from "@/ui/components/function-bar";
import { GrupoGourmetCard } from "@/ui/components/grupo-gourmet-card";
import { PdvShell } from "@/ui/components/pdv-shell";
import { ProdutoCard } from "@/ui/components/produto-card";
import { Topbar } from "@/ui/components/topbar";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";
import { useTeclasFuncao } from "@/ui/hooks/use-teclas-funcao";

type Item = {
	chave: string;
	idproduto: string;
	idprodutomeio?: string | null;
	descricao: string;
	quantidade: number;
	precounitario: number;
	precototal: number;
	pesado?: boolean;
	observacao?: string | null;
};

export function BalcaoPage() {
	const navigate = useNavigate();
	const { status } = useOutletContext<StatusContext>();
	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const gourmet = Boolean(status?.moduloGourmet);
	const bloqueado = secundarioDesconectado(status);
	const { teclas } = useTeclasFuncao();
	const [grupos, setGrupos] = useState<GrupoLocal[]>([]);
	const [atalhos, setAtalhos] = useState<ProdutoLocal[]>([]);
	const [grupoAtivo, setGrupoAtivo] = useState<GrupoLocal | null>(null);
	const [produtos, setProdutos] = useState<ProdutoLocal[]>([]);
	const [carregandoProdutos, setCarregandoProdutos] = useState(false);
	const [buscaProdutos, setBuscaProdutos] = useState<EstadoBuscaProdutos>(
		ESTADO_BUSCA_PRODUTOS_VAZIO,
	);
	const [itens, setItens] = useState<Item[]>([]);
	const [pagando, setPagando] = useState(false);
	const [rejeicaoNfce, setRejeicaoNfce] = useState<string | null>(null);
	const [vendaRejeitadaId, setVendaRejeitadaId] = useState<string | null>(null);
	const [msg, setMsg] = useState("");
	const [loading, setLoading] = useState(false);
	const [pizzaPrimeiro, setPizzaPrimeiro] = useState<ProdutoLocal | null>(null);
	const [produtoPeso, setProdutoPeso] = useState<ProdutoLocal | null>(null);
	const [obsFilaChave, setObsFilaChave] = useState<string | null>(null);
	const [fechando, setFechando] = useState(false);
	const [iniciarComDesconto, setIniciarComDesconto] = useState(false);

	useEscapeFechaModal(Boolean(rejeicaoNfce), () => setRejeicaoNfce(null));
	useEscapeFechaModal(Boolean(pizzaPrimeiro), () => setPizzaPrimeiro(null));
	useEscapeFechaModal(Boolean(produtoPeso), () => setProdutoPeso(null));
	useEscapeFechaModal(Boolean(obsFilaChave), () => setObsFilaChave(null));

	const total = useMemo(
		() => itens.reduce((acc, i) => acc + i.precototal, 0),
		[itens],
	);
	const modoCatalogo = obterModoCatalogoProdutos(
		buscaProdutos.termo,
		Boolean(grupoAtivo),
	);

	useEffect(() => {
		const listarGrupos = gourmet ? "listarGruposGourmet" : "listarGrupos";
		void Promise.all([
			pdvInvoke<GrupoLocal[]>(listarGrupos),
			pdvInvoke<ProdutoLocal[]>("listarAtalhos"),
		]).then(([g, a]) => {
			setGrupos(g);
			setAtalhos(a);
		});
	}, [gourmet]);

	async function abrirGrupo(grupo: GrupoLocal) {
		setGrupoAtivo(grupo);
		setProdutos([]);
		setCarregandoProdutos(true);
		try {
			setProdutos(
				await pdvInvoke<ProdutoLocal[]>(
					gourmet ? "listarProdutosPorGrupoGourmet" : "listarProdutosPorGrupo",
					grupo.id,
				),
			);
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao carregar produtos");
		} finally {
			setCarregandoProdutos(false);
		}
	}

	function adicionarLinha(item: Item) {
		setItens((prev) => [...prev, item]);
	}

	function adicionarProdutoSimples(produto: {
		id: string;
		descricao: string;
		preco: number;
		espizza?: number | null;
		unidademedida?: string | null;
		idunidademedida?: string | null;
	}) {
		if (gourmet && produtoEhPizza(produto)) {
			setPizzaPrimeiro(produto as ProdutoLocal);
			return;
		}
		if (devePedirPeso(produto)) {
			setProdutoPeso(produto as ProdutoLocal);
			return;
		}
		setItens((prev) => {
			const existente = prev.find(
				(i) =>
					i.idproduto === produto.id &&
					!i.idprodutomeio &&
					!i.pesado &&
					!i.observacao?.trim(),
			);
			if (existente) {
				return prev.map((i) =>
					i.chave === existente.chave
						? {
								...i,
								quantidade: i.quantidade + 1,
								precototal: (i.quantidade + 1) * i.precounitario,
							}
						: i,
				);
			}
			return [
				...prev,
				{
					chave: crypto.randomUUID(),
					idproduto: produto.id,
					descricao: produto.descricao,
					quantidade: 1,
					precounitario: produto.preco,
					precototal: produto.preco,
				},
			];
		});
	}

	function confirmarPeso(quantidade: number) {
		const produto = produtoPeso;
		setProdutoPeso(null);
		if (!produto || quantidade <= 0) return;
		adicionarLinha({
			chave: crypto.randomUUID(),
			idproduto: produto.id,
			descricao: produto.descricao,
			quantidade,
			precounitario: produto.preco,
			precototal: quantidade * produto.preco,
			pesado: true,
		});
	}

	function confirmarMeioAMeio(item: ItemPizzaMeioAMeio) {
		adicionarLinha(item);
		setPizzaPrimeiro(null);
	}

	function aplicarObservacaoFila(observacao: string | null) {
		const chave = obsFilaChave;
		setObsFilaChave(null);
		if (!chave) return;
		setItens((prev) =>
			prev.map((item) =>
				item.chave === chave ? { ...item, observacao } : item,
			),
		);
	}

	function venderPizzaInteira(produto: ProdutoLocal) {
		setPizzaPrimeiro(null);
		setItens((prev) => [
			...prev,
			{
				chave: crypto.randomUUID(),
				idproduto: produto.id,
				descricao: produto.descricao,
				quantidade: 1,
				precounitario: produto.preco,
				precototal: produto.preco,
			},
		]);
	}

	async function onBip(codigo: string) {
		const leitura = await pdvInvoke<LeituraCodigoBarras | null>(
			"buscarLeituraCodigoBarras",
			codigo,
		);
		if (!leitura) {
			setMsg(`Produto não encontrado para o código "${codigo}"`);
			return;
		}
		if (leitura.origem === "etiqueta-balanca") {
			adicionarLinha({
				chave: crypto.randomUUID(),
				idproduto: leitura.produto.id,
				descricao: leitura.produto.descricao,
				quantidade: leitura.quantidade,
				precounitario: leitura.precounitario,
				precototal: leitura.precototal,
				pesado: leitura.pesado,
			});
			return;
		}
		adicionarProdutoSimples(leitura.produto);
	}

	function alterarQtd(chave: string, delta: number) {
		setItens((prev) =>
			prev
				.map((i) => {
					if (i.chave !== chave) return i;
					if (i.pesado) {
						return delta < 0 ? { ...i, quantidade: 0, precototal: 0 } : i;
					}
					const quantidade = Math.max(0, i.quantidade + delta);
					return { ...i, quantidade, precototal: quantidade * i.precounitario };
				})
				.filter((i) => i.quantidade > 0),
		);
	}

	async function retirarDepois() {
		if (bloqueado) {
			setMsg(
				status?.principalErro ?? "PDV principal offline. Operação bloqueada.",
			);
			return;
		}
		if (!itens.length) return;
		setLoading(true);
		setMsg("");
		try {
			const conta = await pdvInvoke<{ id: string }>("abrirPedidoEntrega", {
				modalidade: "retirada",
				nomecliente: null,
				telefone: null,
				endereco: null,
				bairro: null,
				valorentrega: 0,
			});
			await pdvInvoke(
				"enviarPedidoConta",
				conta.id,
				crypto.randomUUID(),
				itens.map((item) => ({
					idproduto: item.idproduto,
					quantidade: item.quantidade,
					observacao: normalizarObservacaoItem(item.observacao),
					idprodutomeio: item.idprodutomeio ?? null,
				})),
			);
			setItens([]);
			navigate(`/delivery/${conta.id}`);
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao abrir retirada");
		} finally {
			setLoading(false);
		}
	}

	async function finalizar(fechamento: FechamentoMisto) {
		if (bloqueado) {
			setMsg(
				status?.principalErro ?? "PDV principal offline. Operação bloqueada.",
			);
			setPagando(false);
			return;
		}
		if (!itens.length) return;
		setLoading(true);
		try {
			const result = await pdvInvoke<{
				venda: { id: string };
				fiscal: { modo: string; mensagem: string; chave?: string };
			}>("criarVendaRapida", {
				itens,
				lancamentos: fechamento.lancamentos,
				troco: fechamento.troco,
				cliente: fechamento.cliente,
				valordesconto: fechamento.desconto ?? 0,
			});
			setPagando(false);
			if (result.fiscal.modo === "erro") {
				setVendaRejeitadaId(result.venda.id);
				setRejeicaoNfce(result.fiscal.mensagem);
				setMsg(result.fiscal.mensagem);
				setItens([]);
				return;
			}
			setMsg(result.fiscal.mensagem);
			setItens([]);
		} catch (err) {
			setPagando(false);
			const texto = err instanceof Error ? err.message : "Falha na venda";
			setRejeicaoNfce(texto);
			setMsg(texto);
		} finally {
			setLoading(false);
		}
	}

	async function sair() {
		await pdvInvoke("logout");
		marcarBootPendente();
		navigate("/login", { replace: true });
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: sair usa navigate já listado
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.defaultPrevented) return;
			if (
				pagando ||
				fechando ||
				pizzaPrimeiro ||
				produtoPeso ||
				obsFilaChave ||
				rejeicaoNfce
			) {
				return;
			}
			if (teclaCorresponde(e, teclas.desconto)) {
				if (!itens.length || bloqueado) return;
				e.preventDefault();
				setIniciarComDesconto(true);
				setPagando(true);
				return;
			}
			if (teclaCorresponde(e, teclas.finalizar)) {
				if (!itens.length || bloqueado) return;
				e.preventDefault();
				setIniciarComDesconto(false);
				setPagando(true);
				return;
			}
			if (!gourmet) return;
			if (teclaCorresponde(e, teclas.historico)) {
				e.preventDefault();
				navigate("/vendas");
				return;
			}
			if (teclaCorresponde(e, teclas.fechar_caixa)) {
				e.preventDefault();
				setFechando(true);
				return;
			}
			if (teclaCorresponde(e, teclas.sair)) {
				e.preventDefault();
				void sair();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		bloqueado,
		fechando,
		gourmet,
		itens.length,
		navigate,
		obsFilaChave,
		pagando,
		pizzaPrimeiro,
		produtoPeso,
		rejeicaoNfce,
		teclas.desconto,
		teclas.fechar_caixa,
		teclas.finalizar,
		teclas.historico,
		teclas.sair,
	]);

	const rodape = !gourmet ? (
		<FunctionBar
			actions={[
				{
					key: "historico",
					label: "Histórico",
					hotkey: teclas.historico,
					variant: "secondary",
					disabled: pagando,
					onClick: () => navigate("/vendas"),
				},
				{
					key: "desconto",
					label: "Desconto",
					hotkey: teclas.desconto,
					variant: "outline",
					disabled: pagando || !itens.length || bloqueado,
					onClick: () => {
						setIniciarComDesconto(true);
						setPagando(true);
					},
				},
				...(status?.podeConfigurar
					? [
							{
								key: "config",
								label: "Config",
								hotkey: "F4",
								variant: "outline" as const,
								disabled: pagando,
								onClick: () => navigate("/config"),
							},
						]
					: []),
				{
					key: "fechar-caixa",
					label: "Fechar caixa",
					hotkey: teclas.fechar_caixa,
					variant: "destructive" as const,
					disabled: pagando,
					onClick: () => setFechando(true),
				},
				{
					key: "sair",
					label: "Sair",
					hotkey: teclas.sair,
					variant: "outline" as const,
					disabled: pagando,
					onClick: () => void sair(),
				},
			]}
		/>
	) : null;

	return (
		<PdvShell
			status={status}
			onBlockedNavigate={setMsg}
			footer={rodape}
			topbar={
				<Topbar
					title={gourmet ? "Balcão" : "PDV"}
					subtitle={
						gourmet
							? "Venda rápida"
							: (status?.sessao.nomeempresa ?? "Venda")
					}
					center={
						<BarcodeInput
							onScan={(codigo) => void onBip(codigo)}
							onProduto={(produto) => adicionarProdutoSimples(produto)}
							resultadosExternos
							onBuscaChange={setBuscaProdutos}
							pausado={
								pagando ||
								fechando ||
								Boolean(rejeicaoNfce) ||
								Boolean(pizzaPrimeiro) ||
								Boolean(produtoPeso) ||
								Boolean(obsFilaChave)
							}
							className="border-white/15 bg-white text-foreground shadow-none"
						/>
					}
					right={
						gourmet ? (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => navigate(-1)}
							>
								<ArrowLeft className="size-4" />
								{rotulo.plural}
							</Button>
						) : null
					}
					status={status}
					onExit={() => void sair()}
				/>
			}
		>
			<div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(320px,360px)] gap-2.5 overflow-hidden">
				<section className="pdv-surface flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden p-3">
					<AvisoSecundario status={status} />

					{modoCatalogo === "busca" ? (
							<div className="flex min-h-0 flex-1 flex-col gap-2">
								<h2 className="shrink-0 text-base font-semibold">
									Resultados para “{buscaProdutos.termo}”
								</h2>
								<div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3 overflow-auto p-0.5">
									{buscaProdutos.produtos.map((produto) => (
										<ProdutoCard
											key={produto.id}
											produto={produto}
											disabled={loading}
											onClick={() => adicionarProdutoSimples(produto)}
										/>
									))}
									{buscaProdutos.buscando ? (
										<p className="col-span-full text-sm text-muted-foreground">
											Buscando produtos…
										</p>
									) : buscaProdutos.termo.length < 2 ? (
										<p className="col-span-full text-sm text-muted-foreground">
											Digite ao menos dois caracteres para pesquisar.
										</p>
									) : buscaProdutos.produtos.length === 0 ? (
										<p className="col-span-full text-sm text-muted-foreground">
											Nenhum produto encontrado.
										</p>
									) : null}
								</div>
							</div>
						) : modoCatalogo === "grupos" ? (
							<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
								<div className="shrink-0">
									<h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{gourmet ? "Categorias gourmet" : "Categorias"}
									</h2>
									<div className="flex gap-2 overflow-x-auto p-0.5 pb-2">
										{grupos.map((g) => (
											<GrupoGourmetCard
												key={g.id}
												grupo={g}
												disabled={carregandoProdutos}
												onClick={() => void abrirGrupo(g)}
											/>
										))}
										{grupos.length === 0 &&
											(gourmet || atalhos.length === 0) && (
												<p className="py-3 text-sm text-muted-foreground">
													Nenhum grupo ou atalho sincronizado ainda. Bipe o
													produto normalmente.
												</p>
											)}
									</div>
								</div>
								{!gourmet && atalhos.length > 0 && (
									<div className="min-h-0">
										<h2 className="mb-2 text-base font-semibold">
											Acesso rápido
										</h2>
										<div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
											{atalhos.map((p) => (
												<ProdutoCard
													key={`atalho-${p.id}`}
													produto={p}
													destaque
													onClick={() => adicionarProdutoSimples(p)}
												/>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<>
								<div className="flex shrink-0 items-end justify-between gap-3">
									<div className="min-w-0">
										<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
											Categoria
										</p>
										<h2 className="truncate text-base font-semibold">
											{grupoAtivo?.nome ?? "Produtos"}
										</h2>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setGrupoAtivo(null)}
									>
										<ArrowLeft className="size-4" />
										Categorias
									</Button>
								</div>
								<div className="flex shrink-0 gap-2 overflow-x-auto p-0.5 pb-2">
									{grupos.map((g) => (
										<GrupoGourmetCard
											key={g.id}
											grupo={g}
											disabled={carregandoProdutos}
											onClick={() => void abrirGrupo(g)}
										/>
									))}
								</div>
								<div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3 overflow-auto p-0.5">
									{carregandoProdutos ? (
										<p className="col-span-full text-sm text-muted-foreground">
											Carregando produtos…
										</p>
									) : (
										produtos.map((p) => (
											<ProdutoCard
												key={p.id}
												produto={p}
												onClick={() => adicionarProdutoSimples(p)}
											/>
										))
									)}
									{!carregandoProdutos && produtos.length === 0 && (
										<p className="col-span-full text-sm text-muted-foreground">
											Sem produtos neste grupo.
										</p>
									)}
								</div>
							</>
						)}
				</section>

				<aside className="pdv-surface flex min-h-0 flex-col overflow-hidden">
					<div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
						<div className="flex items-center gap-2">
							<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<ShoppingCart className="size-4" />
							</div>
							<div>
								<h2 className="text-sm font-bold">Carrinho</h2>
								<p className="text-[11px] text-muted-foreground">
									{itens.length} {itens.length === 1 ? "item" : "itens"}
								</p>
							</div>
						</div>
					</div>

					<div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
						{itens.map((item) => (
							<div
								key={item.chave}
								className="rounded-xl border bg-background p-3 shadow-sm"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="line-clamp-2 text-sm font-semibold leading-tight">
											{item.descricao}
										</div>
										<p className="mt-1 text-xs text-muted-foreground">
											{money(item.precounitario)} un.
										</p>
									</div>
									<Button
										size="icon"
										variant={item.observacao ? "secondary" : "ghost"}
										className="size-8 shrink-0"
										title="Adicionar observação"
										onClick={() => setObsFilaChave(item.chave)}
									>
										<MessageSquareText className="size-4" />
										<span className="sr-only">Observação</span>
									</Button>
								</div>
								{item.observacao ? (
									<p className="mt-2 rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
										{item.observacao}
									</p>
								) : null}
								<div className="mt-3 flex items-center justify-between gap-2">
									<div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
										<Button
											size="icon"
											variant="ghost"
											className="size-7"
											onClick={() => alterarQtd(item.chave, -1)}
										>
											<Minus className="size-3.5" />
											<span className="sr-only">Diminuir quantidade</span>
										</Button>
										<span className="min-w-12 text-center text-xs font-semibold tabular-nums">
											{formatarQuantidade(item.quantidade)}
											{item.pesado ? " kg" : ""}
										</span>
										<Button
											size="icon"
											variant="ghost"
											className="size-7"
											disabled={item.pesado}
											onClick={() => alterarQtd(item.chave, 1)}
										>
											<Plus className="size-3.5" />
											<span className="sr-only">Aumentar quantidade</span>
										</Button>
									</div>
									<span className="text-sm font-bold">
										{money(item.precototal)}
									</span>
								</div>
							</div>
						))}
						{itens.length === 0 && (
							<div className="flex h-full min-h-44 flex-col items-center justify-center text-center">
								<div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
									<ShoppingCart className="size-5" />
								</div>
								<p className="text-sm font-semibold">Carrinho vazio</p>
								<p className="mt-1 max-w-48 text-xs text-muted-foreground">
									Bipe um código ou selecione um produto no catálogo.
								</p>
							</div>
						)}
					</div>

					<div className="shrink-0 border-t bg-muted/20 p-3">
						{msg && (
							<p
								className={
									rejeicaoNfce
										? "mb-2 text-xs text-destructive"
										: "mb-2 text-xs text-muted-foreground"
								}
							>
								{msg}
							</p>
						)}
						<div className="mb-3 flex items-end justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Total da venda</p>
								<p className="text-[11px] text-muted-foreground">
									{itens.length} {itens.length === 1 ? "produto" : "produtos"}
								</p>
							</div>
							<span className="text-2xl font-extrabold tracking-tight text-primary">
								{money(total)}
							</span>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant="outline"
								disabled={!itens.length || bloqueado}
								onClick={() => {
									setIniciarComDesconto(true);
									setPagando(true);
								}}
							>
								<Tag className="size-4" />
								Desconto
								<span className="text-[10px] opacity-65">{teclas.desconto}</span>
							</Button>
							{status?.moduloGourmet ? (
								<Button
									variant="secondary"
									disabled={!itens.length || bloqueado || loading}
									onClick={() => void retirarDepois()}
								>
									Retirar depois
								</Button>
							) : (
								<div />
							)}
						</div>
						<Button
							variant="success"
							size="xl"
							className="mt-2 w-full"
							disabled={!itens.length}
							onClick={() => {
								setIniciarComDesconto(false);
								setPagando(true);
							}}
						>
							Finalizar venda
							<span className="ml-2 text-xs font-semibold opacity-80">
								{teclas.finalizar}
							</span>
						</Button>
					</div>
				</aside>
			</div>

			{rejeicaoNfce && (
				<DialogRejeicaoNfce
					mensagem={rejeicaoNfce}
					vendaId={vendaRejeitadaId}
					onFechar={() => {
						setRejeicaoNfce(null);
						setVendaRejeitadaId(null);
					}}
				/>
			)}

			<DialogPagamentoMisto
				aberto={pagando}
				total={total}
				loading={loading}
				titulo="Finalizar venda"
				confirmarLabel="Confirmar"
				iniciarComDesconto={iniciarComDesconto}
				itens={itens.map((item) => ({
					id: item.chave,
					descricao: item.descricao,
					quantidade: item.quantidade,
					precototal: item.precototal,
					observacao: item.observacao,
				}))}
				onCancelar={() => {
					setPagando(false);
					setIniciarComDesconto(false);
				}}
				onConfirmar={(fechamento) => {
					setIniciarComDesconto(false);
					void finalizar(fechamento);
				}}
			/>

			{pizzaPrimeiro && gourmet && (
				<DialogPizzaMeioAMeio
					primeiro={pizzaPrimeiro}
					onCancelar={() => setPizzaPrimeiro(null)}
					onInteira={venderPizzaInteira}
					onConfirmar={confirmarMeioAMeio}
				/>
			)}
			{produtoPeso && (
				<DialogQuantidadePeso
					produto={produtoPeso}
					onCancelar={() => setProdutoPeso(null)}
					onConfirmar={confirmarPeso}
				/>
			)}
			<DialogObservacaoItem
				aberto={Boolean(obsFilaChave)}
				descricao={
					itens.find((item) => item.chave === obsFilaChave)?.descricao ?? ""
				}
				valorInicial={
					itens.find((item) => item.chave === obsFilaChave)?.observacao
				}
				onCancelar={() => setObsFilaChave(null)}
				onConfirmar={aplicarObservacaoFila}
			/>

			<DialogFecharCaixa
				aberto={fechando}
				onFechar={() => setFechando(false)}
				onSucesso={async () => {
					// Tenta subir a fila com o token atual antes de deslogar.
					try {
						await Promise.race([
							pdvInvoke("processarOutboxAgora"),
							new Promise((resolve) => setTimeout(resolve, 8000)),
						]);
					} catch {
						// Sync best-effort; logout segue mesmo se a fila falhar.
					}
					await sair();
				}}
			/>
		</PdvShell>
	);
}

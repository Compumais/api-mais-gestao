import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { marcarBootPendente } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	type GrupoLocal,
	type LeituraCodigoBarras,
	type ProdutoLocal,
	rotuloModelo,
	type StatusContext,
} from "@/lib/pdv-types";
import { normalizarObservacaoItem } from "@/lib/observacao-item";
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
import { ProdutoCard } from "@/ui/components/produto-card";
import { SideNav } from "@/ui/components/side-nav";
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
	const { status, refresh } = useOutletContext<StatusContext>();
	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const gourmet = Boolean(status?.moduloGourmet);
	const bloqueado = secundarioDesconectado(status);
	const { teclas } = useTeclasFuncao();
	const [grupos, setGrupos] = useState<GrupoLocal[]>([]);
	const [atalhos, setAtalhos] = useState<ProdutoLocal[]>([]);
	const [grupoAtivo, setGrupoAtivo] = useState<GrupoLocal | null>(null);
	const [produtos, setProdutos] = useState<ProdutoLocal[]>([]);
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
		setProdutos(
			await pdvInvoke<ProdutoLocal[]>(
				gourmet ? "listarProdutosPorGrupoGourmet" : "listarProdutosPorGrupo",
				grupo.id,
			),
		);
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
			setMsg(
				err instanceof Error ? err.message : "Erro ao abrir retirada",
			);
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

	return (
		<div className="flex h-screen flex-col">
			<Topbar
				title={gourmet ? "Balcão" : "PDV"}
				subtitle={
					gourmet ? "Venda rápida" : (status?.sessao.nomeempresa ?? "Venda")
				}
				right={
					gourmet ? (
						<Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
							Voltar às {rotulo.plural.toLowerCase()}
						</Button>
					) : (
						<div className="flex gap-2">
							{status?.podeConfigurar ? (
								<Button
									variant="secondary"
									size="sm"
									onClick={() => navigate("/config")}
								>
									Configurações
								</Button>
							) : null}
							<Button
								variant="secondary"
								size="sm"
								onClick={() => navigate("/vendas")}
							>
								Histórico
							</Button>
						</div>
					)
				}
			/>

			<div className="flex min-h-0 flex-1 gap-3 overflow-hidden bg-muted/30 p-3">
				<div className="grid min-h-0 min-w-0 flex-1 grid-cols-[1fr_360px] gap-3 overflow-hidden">
				<div className="pdv-surface flex min-h-0 flex-col gap-3 overflow-hidden p-3">
					<AvisoSecundario status={status} />
					<BarcodeInput
						onScan={(codigo) => void onBip(codigo)}
						onProduto={(produto) => adicionarProdutoSimples(produto)}
						pausado={
							pagando ||
							fechando ||
							Boolean(rejeicaoNfce) ||
							Boolean(pizzaPrimeiro) ||
							Boolean(produtoPeso) ||
							Boolean(obsFilaChave)
						}
					/>

					{!grupoAtivo ? (
						<div className="flex flex-1 flex-col gap-3 overflow-auto">
							{atalhos.length > 0 && (
								<div>
									<h2 className="mb-2 text-sm font-semibold">Atalhos</h2>
									<div className="grid auto-rows-min grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
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
							<div>
								<h2 className="mb-2 text-sm font-semibold">Grupos</h2>
								<div className="grid auto-rows-min grid-cols-3 gap-2 sm:grid-cols-4">
									{grupos.map((g) => (
										<button
											key={g.id}
											type="button"
											onClick={() => void abrirGrupo(g)}
											className="rounded-lg bg-background p-4 text-sm font-semibold ring-1 ring-foreground/10 transition hover:ring-primary"
										>
											{g.nome}
										</button>
									))}
									{grupos.length === 0 && atalhos.length === 0 && (
										<p className="col-span-full text-sm text-muted-foreground">
											Nenhum grupo ou atalho sincronizado ainda. Bipe o produto
											normalmente.
										</p>
									)}
								</div>
							</div>
						</div>
					) : (
						<>
							<div className="flex items-center justify-between">
								<h2 className="text-sm font-semibold">{grupoAtivo.nome}</h2>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setGrupoAtivo(null)}
								>
									Voltar aos grupos
								</Button>
							</div>
							<div className="grid flex-1 auto-rows-min grid-cols-3 gap-2 overflow-auto sm:grid-cols-4 lg:grid-cols-5">
								{produtos.map((p) => (
									<ProdutoCard
										key={p.id}
										produto={p}
										onClick={() => adicionarProdutoSimples(p)}
									/>
								))}
								{produtos.length === 0 && (
									<p className="col-span-full text-sm text-muted-foreground">
										Sem produtos neste grupo.
									</p>
								)}
							</div>
						</>
					)}
				</div>

				<div className="pdv-surface flex flex-col p-3">
					<h2 className="mb-2 text-sm font-semibold">Fila</h2>
					<div className="flex-1 space-y-2 overflow-auto">
						{itens.map((item) => (
							<div key={item.chave} className="rounded-md border p-2">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 text-sm font-medium">
										{item.descricao}
									</div>
									<Button
										size="sm"
										variant={item.observacao ? "secondary" : "outline"}
										onClick={() => setObsFilaChave(item.chave)}
									>
										Obs
									</Button>
								</div>
								{item.observacao ? (
									<p className="mt-1 text-xs text-muted-foreground">
										{item.observacao}
									</p>
								) : null}
								<div className="mt-1 flex items-center justify-between gap-2">
									<div className="flex items-center gap-1">
										<Button
											size="sm"
											variant="outline"
											onClick={() => alterarQtd(item.chave, -1)}
										>
											-
										</Button>
										<span className="min-w-10 text-center text-sm tabular-nums">
											{formatarQuantidade(item.quantidade)}
											{item.pesado ? " kg" : ""}
										</span>
										<Button
											size="sm"
											variant="outline"
											disabled={item.pesado}
											onClick={() => alterarQtd(item.chave, 1)}
										>
											+
										</Button>
									</div>
									<span className="text-sm font-semibold">
										{money(item.precototal)}
									</span>
								</div>
							</div>
						))}
						{itens.length === 0 && (
							<p className="text-sm text-muted-foreground">
								Fila vazia — bipe ou selecione um produto
							</p>
						)}
					</div>
					<div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
						<span>Total</span>
						<span className="text-primary">{money(total)}</span>
					</div>
					{msg && (
						<p
							className={
								rejeicaoNfce
									? "mt-2 text-sm text-destructive"
									: "mt-2 text-sm text-muted-foreground"
							}
						>
							{msg}
						</p>
					)}
					<Button
						size="lg"
						variant="outline"
						className="mt-3 w-full"
						disabled={!itens.length || bloqueado}
						onClick={() => {
							setIniciarComDesconto(true);
							setPagando(true);
						}}
					>
						Desconto
						<span className="ml-2 text-xs font-semibold opacity-80">
							{teclas.desconto}
						</span>
					</Button>
					{status?.moduloGourmet ? (
						<Button
							size="lg"
							variant="secondary"
							className="mt-2 w-full"
							disabled={!itens.length || bloqueado || loading}
							onClick={() => void retirarDepois()}
						>
							Retirar depois
						</Button>
					) : null}
					<Button
						size="xl"
						className="mt-2 w-full"
						disabled={!itens.length}
						onClick={() => {
							setIniciarComDesconto(false);
							setPagando(true);
						}}
					>
						Finalizar
						<span className="ml-2 text-xs font-semibold opacity-80">
							{teclas.finalizar}
						</span>
					</Button>
				</div>
				</div>
				<SideNav status={status} onBlocked={setMsg} />
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
					await refresh();
					navigate("/abertura-caixa", { replace: true });
				}}
			/>

			{!gourmet ? (
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
			) : null}
		</div>
	);
}

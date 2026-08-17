import { useEffect, useMemo, useState } from "react";
import {
	useLocation,
	useNavigate,
	useOutletContext,
	useParams,
} from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	type GrupoLocal,
	type LeituraCodigoBarras,
	type MesaResumo,
	type ProdutoLocal,
	rotuloModelo,
	type StatusContext,
} from "@/lib/pdv-types";
import { produtoEhPizza } from "@/lib/pizza-meio-a-meio";
import { devePedirPeso, formatarQuantidade } from "@/lib/produto-kg";
import { money } from "@/lib/utils";
import { AvisoSecundario } from "@/ui/components/aviso-secundario";
import { BarcodeInput } from "@/ui/components/barcode-input";
import { DialogEscolherMesa } from "@/ui/components/dialog-escolher-mesa";
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
import { DialogSenhaGerencial } from "@/ui/components/dialog-senha-gerencial";
import { FunctionBar } from "@/ui/components/function-bar";
import { ProdutoCard } from "@/ui/components/produto-card";
import { Topbar } from "@/ui/components/topbar";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

type ContaMesa = {
	id: string;
	numero_mesa: number;
	nomecliente: string | null;
	valortotal: number;
	numeropessoas?: number;
	subtotal?: number;
	valordesconto?: number;
	valortaxaservico?: number;
	valorcouvert?: number;
	taxa_ativa?: number;
	valorpago?: number;
	valorrestante?: number;
	itens: Array<{
		id: string;
		idproduto: string;
		descricao: string;
		quantidade: number;
		precounitario: number;
		precototal: number;
	}>;
};

type ItemFila = {
	chave: string;
	idproduto: string;
	idprodutomeio?: string | null;
	descricao: string;
	quantidade: number;
	precounitario: number;
	precototal: number;
	pesado?: boolean;
};

type LocationState = {
	nomecliente?: string | null;
};

export function MesaContaPage() {
	const { numero } = useParams<{ numero: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const { status } = useOutletContext<StatusContext>();
	const numeroMesa = Number(numero);
	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const nomeDoState = (location.state as LocationState | null)?.nomecliente;

	const [conta, setConta] = useState<ContaMesa | null>(null);
	const [nomeCliente, setNomeCliente] = useState<string | null>(
		nomeDoState ?? null,
	);
	const [grupos, setGrupos] = useState<GrupoLocal[]>([]);
	const [atalhos, setAtalhos] = useState<ProdutoLocal[]>([]);
	const [grupoAtivo, setGrupoAtivo] = useState<GrupoLocal | null>(null);
	const [produtos, setProdutos] = useState<ProdutoLocal[]>([]);
	const [fila, setFila] = useState<ItemFila[]>([]);
	const [pagando, setPagando] = useState(false);
	const [confirmandoSaida, setConfirmandoSaida] = useState(false);
	const [rejeicaoNfce, setRejeicaoNfce] = useState<string | null>(null);
	const [vendaRejeitadaId, setVendaRejeitadaId] = useState<string | null>(null);
	const [msg, setMsg] = useState("");
	const [loading, setLoading] = useState(false);
	const [pronto, setPronto] = useState(false);
	const [pizzaPrimeiro, setPizzaPrimeiro] = useState<ProdutoLocal | null>(null);
	const [produtoPeso, setProdutoPeso] = useState<ProdutoLocal | null>(null);
	const [mesas, setMesas] = useState<MesaResumo[]>([]);
	const [senhaAberta, setSenhaAberta] = useState(false);
	const [descontoPendente, setDescontoPendente] = useState("");
	const [destinoAberto, setDestinoAberto] = useState<
		null | "transferir" | "juntar" | "itens"
	>(null);
	const [dividirAberto, setDividirAberto] = useState(false);
	const [modoDividir, setModoDividir] = useState<"pessoas" | "valor" | "itens">(
		"pessoas",
	);
	const [qtdPessoasDiv, setQtdPessoasDiv] = useState("2");
	const [valoresDiv, setValoresDiv] = useState("50,50");
	const [itensSel, setItensSel] = useState<string[]>([]);
	const [fatiaValor, setFatiaValor] = useState<number | null>(null);
	const [pagandoFatia, setPagandoFatia] = useState(false);

	useEscapeFechaModal(confirmandoSaida, () => setConfirmandoSaida(false));
	useEscapeFechaModal(Boolean(rejeicaoNfce), () => setRejeicaoNfce(null));
	useEscapeFechaModal(Boolean(pizzaPrimeiro), () => setPizzaPrimeiro(null));
	useEscapeFechaModal(Boolean(produtoPeso), () => setProdutoPeso(null));

	// biome-ignore lint/correctness/useExhaustiveDependencies: iniciar deve reexecutar apenas quando a mesa muda
	useEffect(() => {
		void iniciar();
		void Promise.all([
			pdvInvoke<GrupoLocal[]>("listarGruposGourmet"),
			pdvInvoke<ProdutoLocal[]>("listarAtalhos"),
		]).then(([g, a]) => {
			setGrupos(g);
			setAtalhos(a);
		});
	}, [numeroMesa]);

	// Intercepta Escape global quando há itens na fila (antes do voltar automático).
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "Escape") return;
			if (pagando || confirmandoSaida) return;
			if (fila.length === 0) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			setConfirmandoSaida(true);
		}
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [fila.length, pagando, confirmandoSaida]);

	async function iniciar() {
		setPronto(false);
		setMsg("");
		setFila([]);
		try {
			const existente = await pdvInvoke<ContaMesa | null>(
				"obterContaPorNumero",
				numeroMesa,
			);
			if (existente) {
				setConta(existente);
				setNomeCliente(existente.nomecliente);
			} else {
				setConta(null);
				setNomeCliente(nomeDoState ?? null);
			}
			setMesas(await pdvInvoke<MesaResumo[]>("listarMesas"));
		} catch (err) {
			setMsg(
				err instanceof Error
					? err.message
					: `Erro ao carregar a ${rotulo.singular.toLowerCase()}`,
			);
		} finally {
			setPronto(true);
		}
	}

	function focarProdutos() {
		setGrupoAtivo(null);
		setPagando(false);
		setMsg(
			"Selecione produtos para a fila e depois clique em Adicionar itens.",
		);
	}

	function tentarSair() {
		if (fila.length > 0) {
			setConfirmandoSaida(true);
			return;
		}
		navigate(-1);
	}

	function confirmarSaidaSemSalvar() {
		setFila([]);
		setConfirmandoSaida(false);
		navigate(-1);
	}

	async function abrirGrupo(grupo: GrupoLocal) {
		setGrupoAtivo(grupo);
		setProdutos(
			await pdvInvoke<ProdutoLocal[]>(
				"listarProdutosPorGrupoGourmet",
				grupo.id,
			),
		);
	}

	function enfileirarProduto(produto: {
		id: string;
		descricao: string;
		preco: number;
		espizza?: number | null;
		unidademedida?: string | null;
		idunidademedida?: string | null;
	}) {
		setMsg("");
		if (produtoEhPizza(produto)) {
			setPizzaPrimeiro(produto as ProdutoLocal);
			return;
		}
		if (devePedirPeso(produto)) {
			setProdutoPeso(produto as ProdutoLocal);
			return;
		}
		setFila((prev) => {
			const idx = prev.findIndex(
				(i) => i.idproduto === produto.id && !i.idprodutomeio && !i.pesado,
			);
			if (idx >= 0) {
				const atual = prev[idx];
				const quantidade = atual.quantidade + 1;
				const next = [...prev];
				next[idx] = {
					...atual,
					quantidade,
					precototal: quantidade * atual.precounitario,
				};
				return next;
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
		setFila((prev) => [
			...prev,
			{
				chave: crypto.randomUUID(),
				idproduto: produto.id,
				descricao: produto.descricao,
				quantidade,
				precounitario: produto.preco,
				precototal: quantidade * produto.preco,
				pesado: true,
			},
		]);
	}

	function confirmarMeioAMeio(item: ItemPizzaMeioAMeio) {
		setFila((prev) => [...prev, item]);
		setPizzaPrimeiro(null);
	}

	function venderPizzaInteira(produto: ProdutoLocal) {
		setPizzaPrimeiro(null);
		setFila((prev) => [
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

	function alterarQtdFila(chave: string, delta: number) {
		setFila((prev) =>
			prev
				.map((item) => {
					if (item.chave !== chave) return item;
					if (item.pesado) {
						return delta < 0 ? { ...item, quantidade: 0, precototal: 0 } : item;
					}
					const quantidade = item.quantidade + delta;
					return {
						...item,
						quantidade,
						precototal: quantidade * item.precounitario,
					};
				})
				.filter((item) => item.quantidade > 0),
		);
	}

	function limparFila() {
		setFila([]);
		setMsg("Fila cancelada.");
	}

	function cancelarFila() {
		if (fila.length === 0) return;
		limparFila();
		setGrupoAtivo(null);
	}

	async function confirmarFilaNaConta() {
		if (fila.length === 0) return;
		setLoading(true);
		setMsg("");
		try {
			let atualizada: ContaMesa | null = conta;
			for (const item of fila) {
				atualizada = await pdvInvoke<ContaMesa>(
					"adicionarItemNaMesa",
					numeroMesa,
					{
						idproduto: item.idproduto,
						descricao: item.descricao,
						quantidade: item.quantidade,
						precounitario: item.precounitario,
					},
					nomeCliente ?? undefined,
				);
			}
			if (atualizada) {
				setConta(atualizada);
				setNomeCliente(atualizada.nomecliente);
			}
			setFila([]);
			setGrupoAtivo(null);
			setMsg("Itens adicionados à conta.");
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao lançar itens");
		} finally {
			setLoading(false);
		}
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
			setFila((prev) => [
				...prev,
				{
					chave: crypto.randomUUID(),
					idproduto: leitura.produto.id,
					descricao: leitura.produto.descricao,
					quantidade: leitura.quantidade,
					precounitario: leitura.precounitario,
					precototal: leitura.precototal,
					pesado: leitura.pesado,
				},
			]);
			return;
		}
		enfileirarProduto(leitura.produto);
	}

	async function finalizar(fechamento: FechamentoMisto) {
		if (!conta) return;
		if (fila.length > 0) {
			setMsg("Há itens na fila. Adicione-os à conta antes de receber.");
			setPagando(false);
			return;
		}
		setLoading(true);
		try {
			const result = await pdvInvoke<{
				venda: { id: string };
				fiscal: { modo: string; mensagem: string; cStat?: string };
			}>("fecharContaMesa", conta.id, fechamento.lancamentos, fechamento.troco);
			setPagando(false);
			if (result.fiscal.modo === "erro") {
				setVendaRejeitadaId(result.venda.id);
				setRejeicaoNfce(result.fiscal.mensagem);
				setMsg(result.fiscal.mensagem);
				return;
			}
			setMsg(result.fiscal.mensagem);
			navigate("/", { replace: true });
		} catch (err) {
			setPagando(false);
			const texto =
				err instanceof Error ? err.message : "Erro ao finalizar a conta";
			setRejeicaoNfce(texto);
			setMsg(texto);
		} finally {
			setLoading(false);
		}
	}

	async function aplicarAjustes(parcial: {
		numeropessoas?: number;
		taxaAtiva?: boolean;
		desconto?: number;
		senha?: string;
	}) {
		if (!conta) return;
		setLoading(true);
		setMsg("");
		try {
			const atualizada = await pdvInvoke<ContaMesa>(
				"aplicarAjustesConta",
				conta.id,
				parcial,
			);
			setConta(atualizada);
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao ajustar a conta");
		} finally {
			setLoading(false);
		}
	}

	async function confirmarDesconto(senha: string) {
		const valor = Number(descontoPendente.replace(",", "."));
		setSenhaAberta(false);
		await aplicarAjustes({ desconto: valor, senha });
	}

	async function preConta() {
		if (!conta) return;
		setLoading(true);
		try {
			await pdvInvoke("imprimirPreConta", conta.id);
			setMsg("Pré-conta enviada à impressora.");
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao imprimir pré-conta");
		} finally {
			setLoading(false);
		}
	}

	async function confirmarDestino(numero: number) {
		if (!conta || !destinoAberto) return;
		setLoading(true);
		setMsg("");
		try {
			if (destinoAberto === "juntar") {
				const atualizada = await pdvInvoke<ContaMesa>(
					"juntarContas",
					conta.id,
					numero,
				);
				setConta(atualizada);
				setMsg(
					`Contas juntadas na ${rotulo.singular.toLowerCase()} ${numero}.`,
				);
			} else if (destinoAberto === "itens") {
				const result = await pdvInvoke<{
					origem: ContaMesa | null;
					destino: ContaMesa;
				}>("transferirItens", conta.id, itensSel, numero);
				setConta(result.origem);
				setItensSel([]);
				if (!result.origem) {
					navigate("/", { replace: true });
					return;
				}
				setMsg("Itens transferidos.");
			} else {
				const atualizada = await pdvInvoke<ContaMesa>(
					"transferirConta",
					conta.id,
					numero,
				);
				navigate(`/mesas/${atualizada.numero_mesa}`, { replace: true });
				return;
			}
			setDestinoAberto(null);
			setMesas(await pdvInvoke<MesaResumo[]>("listarMesas"));
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao mover a conta");
		} finally {
			setLoading(false);
		}
	}

	function iniciarDivisao() {
		if (!conta) return;
		setModoDividir("pessoas");
		setQtdPessoasDiv(String(Math.max(2, conta.numeropessoas || 2)));
		setDividirAberto(true);
	}

	function abrirPagamentoFatia() {
		if (!conta) return;
		const restante = conta.valorrestante ?? conta.valortotal;
		if (modoDividir === "itens") {
			if (!itensSel.length) {
				setMsg("Marque os itens desta fatia.");
				return;
			}
			setFatiaValor(null);
			setDividirAberto(false);
			setPagandoFatia(true);
			setPagando(true);
			return;
		}
		if (modoDividir === "pessoas") {
			const n = Math.max(2, Number(qtdPessoasDiv) || 2);
			setFatiaValor(Math.round((restante / n) * 100) / 100);
		} else {
			const partes = valoresDiv
				.split(/[;,\s]+/)
				.map((v) => Number(v.replace(",", ".")))
				.filter((v) => v > 0);
			setFatiaValor(partes[0] ?? restante);
		}
		setDividirAberto(false);
		setPagandoFatia(true);
		setPagando(true);
	}

	async function finalizarFatia(fechamento: FechamentoMisto) {
		if (!conta) return;
		setLoading(true);
		try {
			if (itensSel.length && fatiaValor == null) {
				const result = await pdvInvoke<{
					conta: ContaMesa | null;
					venda: { id: string };
				}>(
					"fecharFatiaItens",
					conta.id,
					itensSel,
					fechamento.lancamentos,
					fechamento.troco,
				);
				setPagando(false);
				setItensSel([]);
				if (!result.conta) {
					navigate("/", { replace: true });
					return;
				}
				setConta(result.conta);
				setMsg("Fatia recebida.");
				return;
			}
			const result = await pdvInvoke<{
				conta: ContaMesa;
				venda: { id: string } | null;
			}>(
				"registrarPagamentoConta",
				conta.id,
				fechamento.lancamentos,
				fechamento.troco,
			);
			setPagando(false);
			setFatiaValor(null);
			if (result.venda) {
				navigate("/", { replace: true });
				return;
			}
			setConta(result.conta);
			setMsg(
				`Pagamento parcial registrado. Restante ${money(result.conta.valorrestante ?? 0)}.`,
			);
		} catch (err) {
			setPagando(false);
			setMsg(err instanceof Error ? err.message : "Erro no pagamento da fatia");
		} finally {
			setLoading(false);
		}
	}

	const itens = conta?.itens ?? [];
	const total = conta?.valorrestante ?? conta?.valortotal ?? 0;
	const totalPagar = fatiaValor ?? total;
	const totalFila = useMemo(
		() => fila.reduce((acc, i) => acc + i.precototal, 0),
		[fila],
	);
	const identificacao = nomeCliente || "Sem identificação";

	return (
		<div className="flex h-screen flex-col">
			<Topbar
				title={`${rotulo.singular} ${numeroMesa}`}
				subtitle={
					conta
						? identificacao
						: `${identificacao} · aguardando primeiro lançamento`
				}
				right={
					<div className="flex gap-2">
						<Button
							variant="secondary"
							size="sm"
							onClick={() => focarProdutos()}
						>
							Selecionar produtos
						</Button>
						<Button variant="outline" size="sm" onClick={() => tentarSair()}>
							Voltar
						</Button>
					</div>
				}
			/>

			<div className="grid flex-1 grid-cols-[1fr_320px] gap-3 overflow-hidden p-3">
				<div className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-lg border bg-card p-3">
					<AvisoSecundario status={status} />
					<div className="flex items-center justify-between gap-2">
						<h2 className="text-sm font-semibold">Selecionar produtos</h2>
						{grupoAtivo && (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setGrupoAtivo(null)}
							>
								Trocar grupo
							</Button>
						)}
					</div>
					<BarcodeInput
						onScan={(codigo) => void onBip(codigo)}
						onProduto={(produto) => enfileirarProduto(produto)}
						pausado={
							pagando ||
							confirmandoSaida ||
							Boolean(rejeicaoNfce) ||
							Boolean(pizzaPrimeiro) ||
							Boolean(produtoPeso) ||
							senhaAberta
						}
					/>

					{!pronto ? (
						<p className="text-sm text-muted-foreground">Carregando...</p>
					) : !grupoAtivo ? (
						<div className="flex flex-1 flex-col gap-3 overflow-auto">
							{atalhos.length > 0 && (
								<div>
									<h2 className="mb-2 text-sm font-semibold">Atalhos</h2>
									<div className="grid auto-rows-min grid-cols-3 gap-2 sm:grid-cols-4">
										{atalhos.map((p) => (
											<ProdutoCard
												key={`atalho-${p.id}`}
												produto={p}
												destaque
												disabled={loading}
												onClick={() => enfileirarProduto(p)}
											/>
										))}
									</div>
								</div>
							)}
							<div>
								<h2 className="mb-2 text-sm font-semibold">Escolha o grupo</h2>
								<div className="grid auto-rows-min grid-cols-3 gap-2 sm:grid-cols-4">
									{grupos.map((g) => (
										<button
											key={g.id}
											type="button"
											onClick={() => void abrirGrupo(g)}
											className="rounded-lg border bg-background p-4 text-sm font-semibold transition hover:border-primary"
										>
											{g.nome}
										</button>
									))}
									{grupos.length === 0 && atalhos.length === 0 && (
										<p className="col-span-full text-sm text-muted-foreground">
											Nenhum grupo ou atalho sincronizado ainda. Use a bipagem
											para enfileirar produtos.
										</p>
									)}
								</div>
							</div>
						</div>
					) : (
						<div className="grid flex-1 auto-rows-min grid-cols-3 gap-2 overflow-auto sm:grid-cols-4">
							{produtos.map((p) => (
								<ProdutoCard
									key={p.id}
									produto={p}
									disabled={loading}
									onClick={() => enfileirarProduto(p)}
								/>
							))}
							{produtos.length === 0 && (
								<p className="col-span-full text-sm text-muted-foreground">
									Sem produtos neste grupo.
								</p>
							)}
						</div>
					)}
				</div>

				<div className="flex min-h-0 flex-col rounded-lg border bg-card p-3">
					<h2 className="mb-2 text-sm font-semibold">
						Fila ({fila.length} {fila.length === 1 ? "item" : "itens"})
					</h2>

					<div className="min-h-0 flex-1 space-y-1 overflow-auto">
						{fila.map((item) => (
							<div
								key={item.chave}
								className="rounded-md border bg-background px-2 py-2 text-sm"
							>
								<div className="line-clamp-2 font-medium">{item.descricao}</div>
								<div className="mt-1 flex items-center justify-between gap-2">
									<div className="flex items-center gap-1">
										<Button
											size="sm"
											variant="outline"
											disabled={loading}
											onClick={() => alterarQtdFila(item.chave, -1)}
										>
											-
										</Button>
										<span className="min-w-10 text-center tabular-nums">
											{formatarQuantidade(item.quantidade)}
											{item.pesado ? " kg" : ""}
										</span>
										<Button
											size="sm"
											variant="outline"
											disabled={loading || item.pesado}
											onClick={() => alterarQtdFila(item.chave, 1)}
										>
											+
										</Button>
									</div>
									<span className="font-semibold text-primary">
										{money(item.precototal)}
									</span>
								</div>
							</div>
						))}
						{fila.length === 0 && (
							<p className="text-sm text-muted-foreground">
								Selecione produtos à esquerda para montar a fila. Depois clique
								em Adicionar itens.
							</p>
						)}

						{itens.length > 0 && (
							<div className="mt-3 border-t pt-3">
								<h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									Já na conta
								</h3>
								{itens.map((item) => (
									<label
										key={item.id}
										className="flex items-center justify-between gap-2 py-0.5 text-xs text-muted-foreground"
									>
										<span className="flex min-w-0 flex-1 items-center gap-1">
											<input
												type="checkbox"
												className="size-3 accent-primary"
												checked={itensSel.includes(item.id)}
												onChange={(e) => {
													setItensSel((prev) =>
														e.target.checked
															? [...prev, item.id]
															: prev.filter((id) => id !== item.id),
													);
												}}
											/>
											<span className="truncate">
												{formatarQuantidade(item.quantidade)}x {item.descricao}
											</span>
										</span>
										<span>{money(item.precototal)}</span>
									</label>
								))}
							</div>
						)}
					</div>

					<div className="mt-2 space-y-1 border-t pt-2 text-sm">
						{fila.length > 0 && (
							<div className="flex justify-between font-medium">
								<span>Subtotal fila</span>
								<span className="text-primary">{money(totalFila)}</span>
							</div>
						)}
						{conta && (
							<>
								<div className="flex items-center justify-between gap-2 text-xs">
									<span>Pessoas</span>
									<Input
										type="number"
										min={1}
										className="h-8 w-16"
										value={conta.numeropessoas ?? 1}
										disabled={!conta || loading}
										onChange={(e) =>
											void aplicarAjustes({
												numeropessoas: Number(e.target.value),
											})
										}
									/>
								</div>
								<label className="flex items-center justify-between text-xs">
									<span>Taxa de serviço</span>
									<input
										type="checkbox"
										className="size-4 accent-primary"
										checked={conta.taxa_ativa === 1}
										disabled={!conta || loading}
										onChange={(e) =>
											void aplicarAjustes({ taxaAtiva: e.target.checked })
										}
									/>
								</label>
								{(conta.subtotal ?? 0) > 0 && (
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Subtotal</span>
										<span>{money(conta.subtotal ?? 0)}</span>
									</div>
								)}
								{(conta.valordesconto ?? 0) > 0 && (
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Desconto</span>
										<span>-{money(conta.valordesconto ?? 0)}</span>
									</div>
								)}
								{(conta.valortaxaservico ?? 0) > 0 && (
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Taxa serviço</span>
										<span>{money(conta.valortaxaservico ?? 0)}</span>
									</div>
								)}
								{(conta.valorcouvert ?? 0) > 0 && (
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Couvert</span>
										<span>{money(conta.valorcouvert ?? 0)}</span>
									</div>
								)}
								{(conta.valorpago ?? 0) > 0 && (
									<div className="flex justify-between text-xs text-muted-foreground">
										<span>Já pago</span>
										<span>{money(conta.valorpago ?? 0)}</span>
									</div>
								)}
							</>
						)}
						<div className="flex justify-between text-lg font-bold">
							<span>A pagar</span>
							<span className="text-primary">{money(total)}</span>
						</div>
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
					<div className="mt-3 grid gap-2">
						<div className="grid grid-cols-2 gap-2">
							<Button
								size="lg"
								variant="outline"
								className="w-full"
								disabled={fila.length === 0 || loading}
								onClick={() => cancelarFila()}
							>
								Cancelar
							</Button>
							<Button
								size="lg"
								variant="default"
								className="w-full"
								disabled={fila.length === 0 || loading}
								onClick={() => void confirmarFilaNaConta()}
							>
								{loading ? "Adicionando..." : "Adicionar itens"}
							</Button>
						</div>
						<Button
							size="lg"
							variant="secondary"
							className="w-full"
							onClick={() => tentarSair()}
						>
							Voltar às {rotulo.plural.toLowerCase()}
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="w-full"
							disabled={!itens.length || fila.length > 0}
							onClick={() => {
								setPagandoFatia(false);
								setFatiaValor(null);
								setPagando(true);
							}}
						>
							Receber / Fechar conta
						</Button>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={!itens.length || loading}
								onClick={() => void preConta()}
							>
								Pré-conta
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={!itens.length || loading}
								onClick={() => iniciarDivisao()}
							>
								Dividir
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={!itens.length || loading}
								onClick={() => setDestinoAberto("transferir")}
							>
								Transferir
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={!itens.length || loading}
								onClick={() => setDestinoAberto("juntar")}
							>
								Juntar
							</Button>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={!itens.length || loading}
								onClick={() => {
									setDescontoPendente("");
									setSenhaAberta(true);
								}}
							>
								Desconto
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={!itensSel.length || loading}
								onClick={() => setDestinoAberto("itens")}
							>
								Mover itens
							</Button>
						</div>
					</div>
				</div>
			</div>

			{confirmandoSaida && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="w-96 space-y-4 rounded-lg border bg-card p-5">
						<h2 className="text-lg font-semibold">Itens na fila</h2>
						<p className="text-sm text-muted-foreground">
							Há {fila.length}{" "}
							{fila.length === 1 ? "item pendente" : "itens pendentes"} na fila
							({money(totalFila)}). Se sair agora, esses itens não serão
							adicionados à conta. Deseja sair mesmo assim?
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => setConfirmandoSaida(false)}
							>
								Continuar lançando
							</Button>
							<Button
								variant="destructive"
								className="flex-1"
								onClick={() => confirmarSaidaSemSalvar()}
							>
								Sair sem adicionar
							</Button>
						</div>
					</div>
				</div>
			)}

			{rejeicaoNfce && (
				<DialogRejeicaoNfce
					mensagem={rejeicaoNfce}
					vendaId={vendaRejeitadaId}
					onFechar={() => {
						const deveSair = Boolean(vendaRejeitadaId);
						setRejeicaoNfce(null);
						setVendaRejeitadaId(null);
						if (deveSair) {
							navigate("/", { replace: true });
						}
					}}
				/>
			)}

			<DialogPagamentoMisto
				aberto={pagando}
				total={totalPagar}
				loading={loading}
				titulo={pagandoFatia ? "Receber fatia" : "Receber / fechar conta"}
				confirmarLabel="Confirmar"
				onCancelar={() => {
					setPagando(false);
					setFatiaValor(null);
					setPagandoFatia(false);
				}}
				onConfirmar={(fechamento) =>
					void (pagandoFatia
						? finalizarFatia(fechamento)
						: finalizar(fechamento))
				}
			/>

			<DialogSenhaGerencial
				aberto={senhaAberta}
				loading={loading}
				onCancelar={() => setSenhaAberta(false)}
				onConfirmar={(senha) => void confirmarDesconto(senha)}
			>
				<Input
					placeholder="Valor do desconto (R$)"
					value={descontoPendente}
					onChange={(e) => setDescontoPendente(e.target.value)}
				/>
			</DialogSenhaGerencial>

			<DialogEscolherMesa
				aberto={destinoAberto !== null}
				titulo={
					destinoAberto === "juntar"
						? `Juntar nesta ${rotulo.singular.toLowerCase()}`
						: destinoAberto === "itens"
							? "Mover itens para"
							: `Transferir para`
				}
				mesas={mesas}
				excluirNumero={numeroMesa}
				apenasOcupadas={destinoAberto === "juntar"}
				loading={loading}
				onCancelar={() => setDestinoAberto(null)}
				onConfirmar={(n) => void confirmarDestino(n)}
			/>

			{dividirAberto && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="w-[28rem] max-w-[95vw] space-y-4 rounded-lg border bg-card p-5">
						<h2 className="text-lg font-semibold">Dividir conta</h2>
						<div className="flex gap-2">
							<Button
								size="sm"
								variant={modoDividir === "pessoas" ? "default" : "outline"}
								onClick={() => setModoDividir("pessoas")}
							>
								Pessoas
							</Button>
							<Button
								size="sm"
								variant={modoDividir === "valor" ? "default" : "outline"}
								onClick={() => setModoDividir("valor")}
							>
								Valor
							</Button>
							<Button
								size="sm"
								variant={modoDividir === "itens" ? "default" : "outline"}
								onClick={() => setModoDividir("itens")}
							>
								Itens
							</Button>
						</div>
						{modoDividir === "pessoas" && (
							<Input
								type="number"
								min={2}
								value={qtdPessoasDiv}
								onChange={(e) => setQtdPessoasDiv(e.target.value)}
							/>
						)}
						{modoDividir === "valor" && (
							<Input
								placeholder="Ex.: 40, 60"
								value={valoresDiv}
								onChange={(e) => setValoresDiv(e.target.value)}
							/>
						)}
						{modoDividir === "itens" && (
							<p className="text-sm text-muted-foreground">
								Marque os itens na lista da conta e depois receba esta fatia.
							</p>
						)}
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => setDividirAberto(false)}
							>
								Cancelar
							</Button>
							<Button className="flex-1" onClick={() => abrirPagamentoFatia()}>
								Receber fatia
							</Button>
						</div>
					</div>
				</div>
			)}

			<FunctionBar
				actions={[
					{
						key: "produtos",
						label: "Produtos",
						hotkey: "F2",
						variant: "secondary",
						onClick: () => focarProdutos(),
					},
					{
						key: "adicionar",
						label: "Adicionar itens",
						hotkey: "F4",
						variant: "default",
						disabled: fila.length === 0 || loading,
						onClick: () => void confirmarFilaNaConta(),
					},
					{
						key: "cancelar",
						label: "Cancelar",
						hotkey: "F3",
						variant: "outline",
						disabled: fila.length === 0 || loading,
						onClick: () => cancelarFila(),
					},
					{
						key: "preconta",
						label: "Pré-conta",
						hotkey: "F6",
						variant: "outline",
						disabled: !itens.length || loading,
						onClick: () => void preConta(),
					},
					{
						key: "receber",
						label: "Receber",
						hotkey: "F5",
						variant: "secondary",
						disabled: !itens.length || fila.length > 0 || loading,
						onClick: () => {
							setPagandoFatia(false);
							setFatiaValor(null);
							setPagando(true);
						},
					},
					{
						key: "voltar",
						label: "Voltar",
						hotkey: "Escape",
						variant: "outline",
						onClick: () => tentarSair(),
					},
				]}
			/>
			{pizzaPrimeiro && (
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
		</div>
	);
}

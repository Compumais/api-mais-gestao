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
	type ProdutoLocal,
	rotuloModelo,
	type StatusContext,
} from "@/lib/pdv-types";
import { produtoEhPizza } from "@/lib/pizza-meio-a-meio";
import { money } from "@/lib/utils";
import { BarcodeInput } from "@/ui/components/barcode-input";
import {
	DialogPagamentoMisto,
	type FechamentoMisto,
} from "@/ui/components/dialog-pagamento-misto";
import {
	DialogPizzaMeioAMeio,
	type ItemPizzaMeioAMeio,
} from "@/ui/components/dialog-pizza-meio-a-meio";
import { FunctionBar } from "@/ui/components/function-bar";
import { ProdutoCard } from "@/ui/components/produto-card";
import { Topbar } from "@/ui/components/topbar";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

type ContaMesa = {
	id: string;
	numero_mesa: number;
	nomecliente: string | null;
	valortotal: number;
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
	const [msg, setMsg] = useState("");
	const [loading, setLoading] = useState(false);
	const [pronto, setPronto] = useState(false);
	const [pizzaPrimeiro, setPizzaPrimeiro] = useState<ProdutoLocal | null>(null);

	useEscapeFechaModal(confirmandoSaida, () => setConfirmandoSaida(false));
	useEscapeFechaModal(Boolean(rejeicaoNfce), () => setRejeicaoNfce(null));
	useEscapeFechaModal(Boolean(pizzaPrimeiro), () => setPizzaPrimeiro(null));

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
	}) {
		setMsg("");
		if (produtoEhPizza(produto)) {
			setPizzaPrimeiro(produto as ProdutoLocal);
			return;
		}
		setFila((prev) => {
			const idx = prev.findIndex(
				(i) => i.idproduto === produto.id && !i.idprodutomeio,
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
		const produto = await pdvInvoke<ProdutoLocal | null>(
			"buscarProdutoPorEan",
			codigo,
		);
		if (produto) {
			enfileirarProduto(produto);
		} else {
			setMsg(`Produto não encontrado para o código "${codigo}"`);
		}
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

	const itens = conta?.itens ?? [];
	const total = conta?.valortotal ?? 0;
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
					<BarcodeInput onScan={(codigo) => void onBip(codigo)} />

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
										<span className="w-6 text-center">{item.quantidade}</span>
										<Button
											size="sm"
											variant="outline"
											disabled={loading}
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
									<div
										key={item.id}
										className="flex justify-between gap-2 py-0.5 text-xs text-muted-foreground"
									>
										<span className="min-w-0 flex-1 truncate">
											{item.quantidade}x {item.descricao}
										</span>
										<span>{money(item.precototal)}</span>
									</div>
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
						<div className="flex justify-between text-lg font-bold">
							<span>Total conta</span>
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
							onClick={() => setPagando(true)}
						>
							Receber / Fechar conta
						</Button>
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
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="w-[28rem] max-w-[95vw] space-y-4 rounded-lg border border-destructive/40 bg-card p-5">
						<h2 className="text-lg font-semibold text-destructive">
							NFC-e rejeitada
						</h2>
						<p className="whitespace-pre-wrap break-words text-sm">
							{rejeicaoNfce}
						</p>
						<p className="text-xs text-muted-foreground">
							A venda foi registrada e deve aparecer na retaguarda web. Corrija
							o cadastro/fiscal e reemita quando possível.
						</p>
						<Button className="w-full" onClick={() => setRejeicaoNfce(null)}>
							Entendi
						</Button>
					</div>
				</div>
			)}

			<DialogPagamentoMisto
				aberto={pagando}
				total={total}
				loading={loading}
				titulo="Receber / fechar conta"
				confirmarLabel="Confirmar e imprimir DANFC-e"
				onCancelar={() => setPagando(false)}
				onConfirmar={(fechamento) => void finalizar(fechamento)}
			/>

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
						key: "receber",
						label: "Receber",
						hotkey: "F5",
						variant: "secondary",
						disabled: !itens.length || fila.length > 0 || loading,
						onClick: () => setPagando(true),
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
		</div>
	);
}

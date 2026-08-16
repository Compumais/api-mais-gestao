import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	type GrupoLocal,
	type MeioPagamento,
	type ProdutoLocal,
	rotuloModelo,
	type StatusContext,
} from "@/lib/pdv-types";
import { produtoEhPizza } from "@/lib/pizza-meio-a-meio";
import { money } from "@/lib/utils";
import { BarcodeInput } from "@/ui/components/barcode-input";
import {
	DialogPizzaMeioAMeio,
	type ItemPizzaMeioAMeio,
} from "@/ui/components/dialog-pizza-meio-a-meio";
import { ProdutoCard } from "@/ui/components/produto-card";
import { Topbar } from "@/ui/components/topbar";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

type Item = {
	chave: string;
	idproduto: string;
	idprodutomeio?: string | null;
	descricao: string;
	quantidade: number;
	precounitario: number;
	precototal: number;
};

export function BalcaoPage() {
	const navigate = useNavigate();
	const { status } = useOutletContext<StatusContext>();
	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const [grupos, setGrupos] = useState<GrupoLocal[]>([]);
	const [atalhos, setAtalhos] = useState<ProdutoLocal[]>([]);
	const [grupoAtivo, setGrupoAtivo] = useState<GrupoLocal | null>(null);
	const [produtos, setProdutos] = useState<ProdutoLocal[]>([]);
	const [itens, setItens] = useState<Item[]>([]);
	const [meio, setMeio] = useState<MeioPagamento>("DINHEIRO");
	const [pagando, setPagando] = useState(false);
	const [rejeicaoNfce, setRejeicaoNfce] = useState<string | null>(null);
	const [msg, setMsg] = useState("");
	const [loading, setLoading] = useState(false);
	const [pizzaPrimeiro, setPizzaPrimeiro] = useState<ProdutoLocal | null>(null);

	useEscapeFechaModal(pagando, () => setPagando(false));
	useEscapeFechaModal(Boolean(rejeicaoNfce), () => setRejeicaoNfce(null));
	useEscapeFechaModal(Boolean(pizzaPrimeiro), () => setPizzaPrimeiro(null));

	const total = useMemo(
		() => itens.reduce((acc, i) => acc + i.precototal, 0),
		[itens],
	);

	useEffect(() => {
		void Promise.all([
			pdvInvoke<GrupoLocal[]>("listarGruposGourmet"),
			pdvInvoke<ProdutoLocal[]>("listarAtalhos"),
		]).then(([g, a]) => {
			setGrupos(g);
			setAtalhos(a);
		});
	}, []);

	async function abrirGrupo(grupo: GrupoLocal) {
		setGrupoAtivo(grupo);
		setProdutos(
			await pdvInvoke<ProdutoLocal[]>(
				"listarProdutosPorGrupoGourmet",
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
	}) {
		if (produtoEhPizza(produto)) {
			setPizzaPrimeiro(produto as ProdutoLocal);
			return;
		}
		setItens((prev) => {
			const existente = prev.find(
				(i) => i.idproduto === produto.id && !i.idprodutomeio,
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

	function confirmarMeioAMeio(item: ItemPizzaMeioAMeio) {
		adicionarLinha(item);
		setPizzaPrimeiro(null);
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
		const produto = await pdvInvoke<ProdutoLocal | null>(
			"buscarProdutoPorEan",
			codigo,
		);
		if (produto) {
			adicionarProdutoSimples(produto);
		} else {
			setMsg(`Produto não encontrado para o código "${codigo}"`);
		}
	}

	function alterarQtd(chave: string, delta: number) {
		setItens((prev) =>
			prev
				.map((i) => {
					if (i.chave !== chave) return i;
					const quantidade = Math.max(0, i.quantidade + delta);
					return { ...i, quantidade, precototal: quantidade * i.precounitario };
				})
				.filter((i) => i.quantidade > 0),
		);
	}

	async function finalizar() {
		if (!itens.length) return;
		setLoading(true);
		try {
			const result = await pdvInvoke<{
				venda: { id: string };
				fiscal: { modo: string; mensagem: string; chave?: string };
			}>("criarVendaRapida", { itens, meio });
			setPagando(false);
			if (result.fiscal.modo === "erro") {
				setRejeicaoNfce(result.fiscal.mensagem);
				setMsg(result.fiscal.mensagem);
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

	return (
		<div className="flex h-screen flex-col">
			<Topbar
				title="Balcão"
				subtitle="Venda rápida"
				right={
					<Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
						Voltar às {rotulo.plural.toLowerCase()}
					</Button>
				}
			/>

			<div className="grid flex-1 grid-cols-[1fr_360px] gap-3 overflow-hidden p-3">
				<div className="flex flex-col gap-3 overflow-hidden rounded-lg border bg-card p-3">
					<BarcodeInput onScan={(codigo) => void onBip(codigo)} />

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
											className="rounded-lg border bg-background p-4 text-sm font-semibold transition hover:border-primary"
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

				<div className="flex flex-col rounded-lg border bg-card p-3">
					<h2 className="mb-2 text-sm font-semibold">Fila</h2>
					<div className="flex-1 space-y-2 overflow-auto">
						{itens.map((item) => (
							<div key={item.chave} className="rounded-md border p-2">
								<div className="text-sm font-medium">{item.descricao}</div>
								<div className="mt-1 flex items-center justify-between gap-2">
									<div className="flex items-center gap-1">
										<Button
											size="sm"
											variant="outline"
											onClick={() => alterarQtd(item.chave, -1)}
										>
											-
										</Button>
										<span className="w-8 text-center text-sm">
											{item.quantidade}
										</span>
										<Button
											size="sm"
											variant="outline"
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
						size="xl"
						className="mt-3 w-full"
						disabled={!itens.length}
						onClick={() => setPagando(true)}
					>
						Finalizar
					</Button>
				</div>
			</div>

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

			{pagando && (
				<div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-primary p-6 text-primary-foreground">
					<div className="text-lg">Total a pagar</div>
					<div className="text-5xl font-bold">{money(total)}</div>
					<div className="grid w-full max-w-md grid-cols-3 gap-3">
						{(["DINHEIRO", "PIX", "CARTAO"] as MeioPagamento[]).map((m) => (
							<Button
								key={m}
								size="lg"
								variant={meio === m ? "secondary" : "outline"}
								className={
									meio === m
										? ""
										: "border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
								}
								onClick={() => setMeio(m)}
							>
								{m === "CARTAO"
									? "Cartão"
									: m.charAt(0) + m.slice(1).toLowerCase()}
							</Button>
						))}
					</div>
					<div className="flex w-full max-w-md gap-3">
						<Button
							variant="outline"
							className="flex-1 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
							disabled={loading}
							onClick={() => setPagando(false)}
						>
							Cancelar
						</Button>
						<Button
							size="lg"
							variant="secondary"
							className="flex-1"
							disabled={loading}
							onClick={() => void finalizar()}
						>
							{loading ? "Finalizando..." : "Confirmar"}
						</Button>
					</div>
				</div>
			)}

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

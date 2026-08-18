import { useEffect, useMemo, useRef, useState } from "react";
import {
	lancamentoTemSitef,
	meioNativoDaFormaNfe,
	podeFecharPagamentos,
	reaisParaDigitos,
	rotuloMeio,
	saldoRestante,
	somarLancamentos,
	trocoEstimado,
} from "@/lib/pagamento";
import { pdvInvoke } from "@/lib/pdv-api";
import type {
	BandeiraCartaoLocal,
	ClienteLocal,
	ClienteVenda,
	LancamentoPagamento,
	MeioPagamento,
	MeioPagamentoLocal,
	SitefCancelarResultado,
	SitefPagarResultado,
	SitefStatus,
} from "@/lib/pdv-types";
import { teclaCorresponde } from "@/lib/teclas-funcao";
import { centavosToNumber, money } from "@/lib/utils";
import { NumericKeypad } from "@/ui/components/numeric-keypad";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";
import { useTeclasFuncao } from "@/ui/hooks/use-teclas-funcao";

export type FechamentoMisto = {
	lancamentos: LancamentoPagamento[];
	troco: number;
	cliente: ClienteVenda | null;
};

type BotaoMeio = {
	id: string;
	meio: MeioPagamento;
	label: string;
};

type DialogPagamentoMistoProps = {
	aberto: boolean;
	total: number;
	loading?: boolean;
	titulo?: string;
	confirmarLabel?: string;
	nomeClienteHint?: string | null;
	onCancelar: () => void;
	onConfirmar: (fechamento: FechamentoMisto) => void;
};

const MEIOS_PADRAO: BotaoMeio[] = [
	{ id: "DINHEIRO", meio: "DINHEIRO", label: "Dinheiro" },
	{ id: "PIX", meio: "PIX", label: "PIX" },
	{ id: "CARTAO", meio: "CARTAO", label: "Cartão" },
];

function rotuloCliente(cliente: ClienteLocal): string {
	return (
		cliente.nome?.trim() ||
		cliente.razaosocial?.trim() ||
		cliente.cnpjcpf?.trim() ||
		"Cliente"
	);
}

export function DialogPagamentoMisto({
	aberto,
	total,
	loading = false,
	titulo = "Pagamento",
	confirmarLabel = "Confirmar",
	nomeClienteHint = null,
	onCancelar,
	onConfirmar,
}: DialogPagamentoMistoProps) {
	const [lancamentos, setLancamentos] = useState<LancamentoPagamento[]>([]);
	const [digitos, setDigitos] = useState("0");
	const [sitef, setSitef] = useState<SitefStatus | null>(null);
	const [processando, setProcessando] = useState(false);
	const [erro, setErro] = useState("");
	const [buscaCliente, setBuscaCliente] = useState("");
	const [sugestoes, setSugestoes] = useState<ClienteLocal[]>([]);
	const [cliente, setCliente] = useState<ClienteVenda | null>(null);
	const [meios, setMeios] = useState<BotaoMeio[]>(MEIOS_PADRAO);
	const [bandeiras, setBandeiras] = useState<BandeiraCartaoLocal[]>([]);
	const [pendenteBandeira, setPendenteBandeira] = useState<number | null>(null);
	const { teclas } = useTeclasFuncao();

	const restante = useMemo(
		() => saldoRestante(total, lancamentos),
		[total, lancamentos],
	);
	const pago = useMemo(() => somarLancamentos(lancamentos), [lancamentos]);
	const troco = useMemo(
		() => trocoEstimado(total, lancamentos),
		[total, lancamentos],
	);
	const podeFechar = podeFecharPagamentos(total, lancamentos);
	const ocupado = loading || processando;

	useEffect(() => {
		if (!aberto) return;
		setLancamentos([]);
		setDigitos(reaisParaDigitos(total));
		setErro("");
		setProcessando(false);
		setCliente(null);
		setBuscaCliente(nomeClienteHint?.trim() ?? "");
		setSugestoes([]);
		setPendenteBandeira(null);
		void pdvInvoke<SitefStatus>("sitef.status")
			.then(setSitef)
			.catch(() => setSitef(null));
		void pdvInvoke<MeioPagamentoLocal[]>("listarMeiosPagamento")
			.then((lista) => {
				const botoes = lista
					.filter((item) => item.aprazo !== 1)
					.map((item) => {
						const meio = meioNativoDaFormaNfe(item.formapagamentonfe);
						if (!meio) return null;
						return { id: item.id, meio, label: item.descricao };
					})
					.filter((item): item is BotaoMeio => item !== null);
				setMeios(botoes.length ? botoes : MEIOS_PADRAO);
			})
			.catch(() => setMeios(MEIOS_PADRAO));
		void pdvInvoke<BandeiraCartaoLocal[]>("listarBandeirasCartao")
			.then(setBandeiras)
			.catch(() => setBandeiras([]));
	}, [aberto, total, nomeClienteHint]);

	useEffect(() => {
		if (!aberto) return;
		setDigitos(reaisParaDigitos(restante));
	}, [aberto, restante]);

	useEffect(() => {
		if (!aberto || cliente) {
			setSugestoes([]);
			return;
		}
		const termo = buscaCliente.trim();
		if (termo.length < 2) {
			setSugestoes([]);
			return;
		}
		const handle = window.setTimeout(() => {
			void pdvInvoke<ClienteLocal[]>("buscarClientes", termo)
				.then(setSugestoes)
				.catch(() => setSugestoes([]));
		}, 200);
		return () => window.clearTimeout(handle);
	}, [aberto, buscaCliente, cliente]);

	async function cancelarAutorizados(lista: LancamentoPagamento[]) {
		for (const item of lista) {
			if (!lancamentoTemSitef(item)) continue;
			try {
				await pdvInvoke<SitefCancelarResultado>("sitef.cancelar", {
					nsu: item.nsu,
					valor: item.valor,
				});
			} catch {
				// desfazimento local segue; PIN pad pode exigir estorno manual
			}
		}
	}

	async function fecharDialog() {
		if (ocupado) return;
		setProcessando(true);
		try {
			await cancelarAutorizados(lancamentos);
		} finally {
			setProcessando(false);
			onCancelar();
		}
	}

	useEscapeFechaModal(aberto, () => {
		void fecharDialog();
	});

	function confirmarFechamento(lista: LancamentoPagamento[]) {
		onConfirmar({
			lancamentos: lista,
			troco: trocoEstimado(total, lista),
			cliente,
		});
	}

	async function adicionar(meio: MeioPagamento, bandeira?: string | null) {
		if (ocupado) return;
		const valor = centavosToNumber(digitos);
		if (!(valor > 0)) {
			setErro("Informe um valor maior que zero");
			return;
		}
		if (meio !== "DINHEIRO" && valor - restante > 0.001) {
			setErro("PIX e cartão não podem ultrapassar o restante");
			return;
		}
		if (restante <= 0 && meio !== "DINHEIRO") {
			setErro("Saldo já está zerado");
			return;
		}

		setErro("");
		if (meio !== "CARTAO") {
			setLancamentos((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					meio,
					valor,
					status: "ok",
				},
			]);
			return;
		}

		const status =
			sitef ?? (await pdvInvoke<SitefStatus>("sitef.status").catch(() => null));
		if (status) setSitef(status);
		if (!status?.disponivel) {
			if (!bandeira && bandeiras.length) {
				setPendenteBandeira(valor);
				return;
			}
			setPendenteBandeira(null);
			setLancamentos((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					meio: "CARTAO",
					valor,
					status: "ok",
					bandeira: bandeira ?? null,
				},
			]);
			return;
		}

		setProcessando(true);
		try {
			const result = await pdvInvoke<SitefPagarResultado>("sitef.pagar", {
				valor,
			});
			if (result.manual) {
				if (!bandeira && bandeiras.length) {
					setPendenteBandeira(valor);
					return;
				}
				setLancamentos((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						meio: "CARTAO",
						valor,
						status: "ok",
						bandeira: bandeira ?? null,
					},
				]);
				return;
			}
			if (!result.ok) {
				setErro(result.mensagem || "Pagamento SiTef não autorizado");
				return;
			}
			setLancamentos((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					meio: "CARTAO",
					valor,
					status: "ok",
					nsu: result.nsu ?? null,
					autorizacao: result.autorizacao ?? null,
					bandeira: result.bandeira ?? bandeira ?? null,
				},
			]);
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha no SiTef");
		} finally {
			setProcessando(false);
		}
	}

	const adicionarRef = useRef(adicionar);
	adicionarRef.current = adicionar;

	useEffect(() => {
		if (!aberto) return;
		function onKeyDown(e: KeyboardEvent) {
			if (ocupado) return;
			const meio: MeioPagamento | null = teclaCorresponde(e, teclas.dinheiro)
				? "DINHEIRO"
				: teclaCorresponde(e, teclas.pix)
					? "PIX"
					: teclaCorresponde(e, teclas.cartao)
						? "CARTAO"
						: null;
			if (!meio) return;
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			void adicionarRef.current(meio);
		}
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [aberto, ocupado, teclas.cartao, teclas.dinheiro, teclas.pix]);

	async function remover(id: string | undefined, indice: number) {
		if (ocupado) return;
		const item = id
			? lancamentos.find((l) => l.id === id)
			: lancamentos[indice];
		if (!item) return;
		setErro("");
		if (lancamentoTemSitef(item)) {
			setProcessando(true);
			try {
				const result = await pdvInvoke<SitefCancelarResultado>(
					"sitef.cancelar",
					{ nsu: item.nsu, valor: item.valor },
				);
				if (!result.ok) {
					setErro(result.mensagem || "Não foi possível cancelar no SiTef");
					return;
				}
			} catch (err) {
				setErro(
					err instanceof Error ? err.message : "Falha ao cancelar no SiTef",
				);
				return;
			} finally {
				setProcessando(false);
			}
		}
		setLancamentos((prev) =>
			prev.filter((l, i) => (id ? l.id !== id : i !== indice)),
		);
	}

	async function aoEnter() {
		if (ocupado) return;
		if (podeFechar) {
			confirmarFechamento(lancamentos);
			return;
		}
		const valor = centavosToNumber(digitos);
		if (!(valor > 0)) {
			setErro("Informe um valor maior que zero");
			return;
		}
		const novo: LancamentoPagamento[] = [
			...lancamentos,
			{
				id: crypto.randomUUID(),
				meio: "DINHEIRO",
				valor,
				status: "ok",
			},
		];
		if (podeFecharPagamentos(total, novo)) {
			confirmarFechamento(novo);
			return;
		}
		setLancamentos(novo);
	}

	function escolherCliente(item: ClienteLocal) {
		setCliente({
			id: item.id,
			nome: rotuloCliente(item),
			cnpjcpf: item.cnpjcpf,
		});
		setBuscaCliente(rotuloCliente(item));
		setSugestoes([]);
	}

	if (!aberto) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
			<div className="flex max-h-[95vh] w-[32rem] max-w-[95vw] flex-col gap-3 overflow-auto rounded-lg border bg-card p-5">
				<h2 className="text-lg font-semibold">{titulo}</h2>
				<div className="space-y-1">
					<p className="text-xs font-medium text-muted-foreground">
						Cliente (opcional)
					</p>
					{cliente ? (
						<div className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5">
							<div className="min-w-0">
								<div className="truncate text-sm font-medium">
									{cliente.nome}
								</div>
								{cliente.cnpjcpf ? (
									<div className="text-xs text-muted-foreground">
										{cliente.cnpjcpf}
									</div>
								) : null}
							</div>
							<Button
								size="sm"
								variant="ghost"
								disabled={ocupado}
								onClick={() => {
									setCliente(null);
									setBuscaCliente("");
								}}
							>
								Limpar
							</Button>
						</div>
					) : (
						<div className="relative">
							<Input
								id="pdv-cliente-busca"
								value={buscaCliente}
								onChange={(event) => setBuscaCliente(event.target.value)}
								placeholder="Nome, CPF ou CNPJ"
								disabled={ocupado}
								aria-label="Buscar cliente"
							/>
							{sugestoes.length > 0 && (
								<div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border bg-popover shadow-md">
									{sugestoes.map((item) => (
										<button
											key={item.id}
											type="button"
											className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
											onClick={() => escolherCliente(item)}
										>
											<span className="font-medium">{rotuloCliente(item)}</span>
											{item.cnpjcpf ? (
												<span className="text-xs text-muted-foreground">
													{item.cnpjcpf}
												</span>
											) : null}
										</button>
									))}
								</div>
							)}
						</div>
					)}
				</div>
				<div className="grid grid-cols-2 gap-2 text-center">
					<div className="rounded-md border bg-background px-2 py-2">
						<div className="text-xs text-muted-foreground">Total</div>
						<div className="text-xl font-bold">{money(total)}</div>
					</div>
					<div
						className={
							restante > 0
								? "rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-2"
								: "rounded-md border border-primary/40 bg-primary/10 px-2 py-2"
						}
					>
						<div className="text-xs text-muted-foreground">Restante</div>
						<div
							className={
								restante > 0
									? "text-2xl font-bold text-amber-700 dark:text-amber-400"
									: "text-2xl font-bold text-primary"
							}
						>
							{money(restante)}
						</div>
					</div>
				</div>
				{troco > 0 && (
					<p className="text-center text-sm font-medium">
						Troco: <span className="text-primary">{money(troco)}</span>
					</p>
				)}

				<div className="text-center text-3xl font-bold text-primary">
					{money(centavosToNumber(digitos))}
				</div>
				<NumericKeypad
					digits={digitos}
					onChange={setDigitos}
					disabled={ocupado}
					onEnter={() => void aoEnter()}
				/>
				<p className="text-center text-xs text-muted-foreground">
					Enter lança em dinheiro e confirma quando o restante zerar.
				</p>

				{pendenteBandeira != null ? (
					<div className="space-y-2 rounded-md border bg-background p-2">
						<p className="text-sm font-medium">Bandeira do cartão</p>
						<div className="grid grid-cols-2 gap-2">
							{bandeiras.map((bandeira) => (
								<Button
									key={bandeira.id}
									variant="outline"
									disabled={ocupado}
									onClick={() => void adicionar("CARTAO", bandeira.descricao)}
								>
									{bandeira.descricao}
								</Button>
							))}
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setPendenteBandeira(null)}
						>
							Cancelar
						</Button>
					</div>
				) : (
					<div
						className={
							meios.length > 3
								? "grid grid-cols-2 gap-2"
								: "grid grid-cols-3 gap-2"
						}
					>
						{meios.map((botao) => {
							const atalho =
								botao.meio === "DINHEIRO"
									? teclas.dinheiro
									: botao.meio === "PIX"
										? teclas.pix
										: teclas.cartao;
							const mostrarAtalho =
								meios.filter((item) => item.meio === botao.meio).length === 1;
							return (
								<Button
									key={botao.id}
									variant="outline"
									disabled={
										ocupado || (restante <= 0 && botao.meio !== "DINHEIRO")
									}
									onClick={() => void adicionar(botao.meio)}
								>
									<span className="flex flex-col items-center leading-tight">
										<span>
											{botao.meio === "CARTAO" && sitef?.disponivel
												? `${botao.label}/SiTef`
												: botao.label}
										</span>
										{mostrarAtalho ? (
											<span className="text-[10px] font-semibold opacity-70">
												{atalho}
											</span>
										) : null}
									</span>
								</Button>
							);
						})}
					</div>
				)}
				<p className="text-xs text-muted-foreground">
					{processando
						? "Aguardando PIN pad…"
						: sitef?.disponivel
							? "Cartão passa pela PIN pad SiTef."
							: (sitef?.mensagem ??
								"SiTef indisponível — cartão entra como lançamento manual.")}
				</p>

				<div className="min-h-16 space-y-1 rounded-md border bg-background p-2">
					{lancamentos.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhum lançamento. Adicione um meio até zerar o restante.
						</p>
					) : (
						lancamentos.map((item, indice) => (
							<div
								key={item.id ?? `${item.meio}-${indice}`}
								className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
							>
								<div className="min-w-0">
									<div className="font-medium">
										{rotuloMeio(item.meio)} · {money(item.valor)}
									</div>
									{(item.nsu || item.autorizacao || item.bandeira) && (
										<div className="text-xs text-muted-foreground">
											{[
												item.bandeira,
												item.nsu ? `NSU ${item.nsu}` : null,
												item.autorizacao ? `Aut. ${item.autorizacao}` : null,
											]
												.filter(Boolean)
												.join(" · ")}
										</div>
									)}
								</div>
								<Button
									size="sm"
									variant="ghost"
									disabled={ocupado}
									onClick={() => void remover(item.id, indice)}
								>
									Remover
								</Button>
							</div>
						))
					)}
				</div>

				{pago > 0 && (
					<p className="text-xs text-muted-foreground">
						Pago {money(pago)} de {money(total)}
					</p>
				)}
				{erro && <p className="text-sm text-destructive">{erro}</p>}

				<div className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1"
						disabled={ocupado}
						onClick={() => void fecharDialog()}
					>
						Cancelar
					</Button>
					<Button
						className="flex-1"
						disabled={ocupado || !podeFechar}
						onClick={() => confirmarFechamento(lancamentos)}
					>
						{loading
							? "Finalizando..."
							: processando
								? "Aguarde..."
								: confirmarLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}

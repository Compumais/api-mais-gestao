import { useEffect, useMemo, useRef, useState } from "react";
import {
	type BotaoMeioPagamento,
	CHAVE_TECLADO_VIRTUAL_PAGAMENTO,
	calcularDescontoInformado,
	lancamentoTemSitef,
	MEIOS_PAGAMENTO_PADRAO,
	montarBotoesMeiosPagamento,
	podeFecharPagamentos,
	reaisParaDigitos,
	rotuloMeio,
	saldoRestante,
	somarLancamentos,
	tecladoVirtualPagamentoAtivo,
	trocoEstimado,
} from "@/lib/pagamento";
import { pdvInvoke } from "@/lib/pdv-api";
import type {
	BandeiraCartaoLocal,
	ClienteLocal,
	ClienteVenda,
	LancamentoPagamento,
	MeioPagamentoLocal,
	SitefCancelarResultado,
	SitefPagarResultado,
	SitefStatus,
} from "@/lib/pdv-types";
import {
	resolverTeclasMeiosPagamento,
	teclaCorresponde,
} from "@/lib/teclas-funcao";
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
	desconto: number;
	senhaGerencial: string | null;
};

type DialogPagamentoMistoProps = {
	aberto: boolean;
	total: number;
	loading?: boolean;
	titulo?: string;
	confirmarLabel?: string;
	nomeClienteHint?: string | null;
	permitirDesconto?: boolean;
	iniciarComDesconto?: boolean;
	descontoJaAplicado?: number;
	onCancelar: () => void;
	onConfirmar: (fechamento: FechamentoMisto) => void;
};

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function rotuloCliente(cliente: ClienteLocal): string {
	return (
		cliente.nome?.trim() ||
		cliente.razaosocial?.trim() ||
		cliente.cnpjcpf?.trim() ||
		"Cliente"
	);
}

function camposDaForma(
	botao: BotaoMeioPagamento,
): Pick<
	LancamentoPagamento,
	"descricao" | "formapagamentonfe" | "idtipodocumentofinanceiro" | "aprazo"
> {
	return {
		descricao: botao.label,
		formapagamentonfe: botao.formapagamentonfe,
		idtipodocumentofinanceiro: UUID_RE.test(botao.id) ? botao.id : null,
		aprazo: botao.aprazo === 1 ? 1 : 0,
	};
}

export function DialogPagamentoMisto({
	aberto,
	total,
	loading = false,
	titulo = "Pagamento",
	confirmarLabel = "Confirmar",
	nomeClienteHint = null,
	permitirDesconto = true,
	iniciarComDesconto = false,
	descontoJaAplicado = 0,
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
	const [meios, setMeios] = useState<BotaoMeioPagamento[]>(
		MEIOS_PAGAMENTO_PADRAO,
	);
	const [bandeiras, setBandeiras] = useState<BandeiraCartaoLocal[]>([]);
	const [pendenteBandeira, setPendenteBandeira] =
		useState<BotaoMeioPagamento | null>(null);
	const [mostrarTeclado, setMostrarTeclado] = useState(true);
	const [descontoAplicado, setDescontoAplicado] = useState(0);
	const [senhaUsada, setSenhaUsada] = useState("");
	const [painelDesconto, setPainelDesconto] = useState(false);
	const [descontoInput, setDescontoInput] = useState("");
	const [descontoPercentual, setDescontoPercentual] = useState(false);
	const [senhaDesconto, setSenhaDesconto] = useState("");
	const { teclas, meios: teclasMeios } = useTeclasFuncao();

	const totalLiquido = useMemo(
		() => Math.max(0, total - descontoAplicado),
		[total, descontoAplicado],
	);
	const restante = useMemo(
		() => saldoRestante(totalLiquido, lancamentos),
		[totalLiquido, lancamentos],
	);
	const pago = useMemo(() => somarLancamentos(lancamentos), [lancamentos]);
	const troco = useMemo(
		() => trocoEstimado(totalLiquido, lancamentos),
		[totalLiquido, lancamentos],
	);
	const podeFechar = podeFecharPagamentos(totalLiquido, lancamentos);
	const ocupado = loading || processando;
	const exigeCliente = meios.some((item) => item.aprazo === 1);
	const atalhosMeios = useMemo(
		() => resolverTeclasMeiosPagamento(meios, teclas, teclasMeios),
		[meios, teclas, teclasMeios],
	);

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
		setDescontoAplicado(0);
		setSenhaUsada("");
		setDescontoInput("");
		setDescontoPercentual(false);
		setSenhaDesconto("");
		setPainelDesconto(permitirDesconto && iniciarComDesconto);
		void pdvInvoke<Record<string, string>>("getConfig")
			.then((config) => {
				setMostrarTeclado(
					tecladoVirtualPagamentoAtivo(config[CHAVE_TECLADO_VIRTUAL_PAGAMENTO]),
				);
			})
			.catch(() => setMostrarTeclado(true));
		void pdvInvoke<SitefStatus>("sitef.status")
			.then(setSitef)
			.catch(() => setSitef(null));
		void pdvInvoke<MeioPagamentoLocal[]>("listarMeiosPagamento")
			.then((lista) => setMeios(montarBotoesMeiosPagamento(lista)))
			.catch(() => setMeios(MEIOS_PAGAMENTO_PADRAO));
		void pdvInvoke<BandeiraCartaoLocal[]>("listarBandeirasCartao")
			.then(setBandeiras)
			.catch(() => setBandeiras([]));
	}, [aberto, iniciarComDesconto, nomeClienteHint, permitirDesconto, total]);

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
		if (lista.some((item) => item.aprazo === 1) && !cliente) {
			setErro("Informe o cliente para pagamento a prazo");
			return;
		}
		onConfirmar({
			lancamentos: lista,
			troco: trocoEstimado(totalLiquido, lista),
			cliente,
			desconto: descontoAplicado,
			senhaGerencial: senhaUsada || null,
		});
	}

	function abrirPainelDesconto() {
		if (!permitirDesconto || ocupado) return;
		if (lancamentos.length) {
			setErro("Remova os lançamentos para alterar o desconto");
			return;
		}
		setErro("");
		setPainelDesconto(true);
	}

	async function aplicarDesconto() {
		if (!permitirDesconto || ocupado) return;
		if (lancamentos.length) {
			setErro("Remova os lançamentos para alterar o desconto");
			return;
		}
		const informado = Number(descontoInput.replace(",", "."));
		const calculado = calcularDescontoInformado(
			total,
			informado,
			descontoPercentual,
		);
		if (!(calculado > 0)) {
			setErro("Informe um desconto válido");
			return;
		}
		setProcessando(true);
		try {
			const definida = await pdvInvoke<boolean>("senhaGerencialDefinida");
			if (!definida) {
				setErro("Defina a senha gerencial nas configurações do PDV");
				return;
			}
			const ok = await pdvInvoke<boolean>(
				"validarSenhaGerencial",
				senhaDesconto,
			);
			if (!ok) {
				setErro("Senha gerencial inválida");
				return;
			}
			setDescontoAplicado(calculado);
			setSenhaUsada(senhaDesconto);
			setPainelDesconto(false);
			setSenhaDesconto("");
			setErro("");
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha ao validar a senha");
		} finally {
			setProcessando(false);
		}
	}

	function limparDesconto() {
		if (ocupado) return;
		if (lancamentos.length) {
			setErro("Remova os lançamentos para alterar o desconto");
			return;
		}
		setDescontoAplicado(0);
		setSenhaUsada("");
		setDescontoInput("");
		setSenhaDesconto("");
		setErro("");
	}

	async function adicionar(
		botao: BotaoMeioPagamento,
		bandeira?: string | null,
	) {
		if (ocupado) return;
		const valor = centavosToNumber(digitos);
		if (!(valor > 0)) {
			setErro("Informe um valor maior que zero");
			return;
		}
		if (botao.aprazo === 1 && !cliente) {
			setErro("Informe o cliente para pagamento a prazo");
			return;
		}
		if (botao.meio !== "DINHEIRO" && valor - restante > 0.001) {
			setErro("Este meio não pode ultrapassar o restante");
			return;
		}
		if (restante <= 0 && botao.meio !== "DINHEIRO") {
			setErro("Saldo já está zerado");
			return;
		}

		const extras = camposDaForma(botao);
		setErro("");
		if (botao.meio !== "CARTAO") {
			setLancamentos((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					meio: botao.meio,
					valor,
					status: "ok",
					...extras,
				},
			]);
			return;
		}

		const status =
			sitef ?? (await pdvInvoke<SitefStatus>("sitef.status").catch(() => null));
		if (status) setSitef(status);
		if (!status?.disponivel) {
			if (!bandeira && bandeiras.length) {
				setPendenteBandeira(botao);
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
					...extras,
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
					setPendenteBandeira(botao);
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
						...extras,
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
					...extras,
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
	const meiosRef = useRef(meios);
	meiosRef.current = meios;
	const atalhosRef = useRef(atalhosMeios);
	atalhosRef.current = atalhosMeios;
	const teclaDescontoRef = useRef(teclas.desconto);
	teclaDescontoRef.current = teclas.desconto;
	const abrirDescontoRef = useRef(abrirPainelDesconto);
	abrirDescontoRef.current = abrirPainelDesconto;

	useEffect(() => {
		if (!aberto) return;
		function onKeyDown(e: KeyboardEvent) {
			if (ocupado) return;
			if (teclaCorresponde(e, teclaDescontoRef.current)) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				abrirDescontoRef.current();
				return;
			}
			const botao = meiosRef.current.find((item) => {
				const atalho = atalhosRef.current[item.id];
				return Boolean(atalho) && teclaCorresponde(e, atalho);
			});
			if (!botao) return;
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			void adicionarRef.current(botao);
		}
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [aberto, ocupado]);

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
		const dinheiro =
			meios.find((item) => item.meio === "DINHEIRO") ??
			MEIOS_PAGAMENTO_PADRAO[0];
		const novo: LancamentoPagamento[] = [
			...lancamentos,
			{
				id: crypto.randomUUID(),
				meio: "DINHEIRO",
				valor,
				status: "ok",
				...camposDaForma(dinheiro),
			},
		];
		if (podeFecharPagamentos(totalLiquido, novo)) {
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
			<div className="flex max-h-[95vh] w-[56rem] max-w-[96vw] flex-col overflow-hidden rounded-lg border bg-card">
				<div className="flex items-start justify-between gap-3 border-b px-5 py-4">
					<div>
						<h2 className="text-lg font-semibold">{titulo}</h2>
						<p className="text-xs text-muted-foreground">
							Informe o valor e escolha o meio. Enter lança em dinheiro e
							confirma quando o restante zerar.
						</p>
						{descontoJaAplicado > 0 ? (
							<p className="text-xs text-muted-foreground">
								Desconto já na conta: {money(descontoJaAplicado)}
							</p>
						) : null}
					</div>
					<div className="flex gap-2 text-center">
						<div className="min-w-28 rounded-md border bg-background px-3 py-2">
							<div className="text-[11px] text-muted-foreground">Total</div>
							<div className="text-lg font-bold">{money(totalLiquido)}</div>
							{descontoAplicado > 0 ? (
								<div className="text-[10px] text-muted-foreground">
									de {money(total)}
								</div>
							) : null}
						</div>
						{descontoAplicado > 0 ? (
							<div className="min-w-28 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
								<div className="text-[11px] text-muted-foreground">
									Desconto
								</div>
								<div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
									-{money(descontoAplicado)}
								</div>
							</div>
						) : null}
						<div
							className={
								restante > 0
									? "min-w-28 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2"
									: "min-w-28 rounded-md border border-primary/40 bg-primary/10 px-3 py-2"
							}
						>
							<div className="text-[11px] text-muted-foreground">Restante</div>
							<div
								className={
									restante > 0
										? "text-lg font-bold text-amber-700 dark:text-amber-400"
										: "text-lg font-bold text-primary"
								}
							>
								{money(restante)}
							</div>
						</div>
					</div>
				</div>

				<div className="grid min-h-0 flex-1 gap-4 overflow-auto p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<div className="space-y-3">
						<div className="space-y-1">
							<p className="text-xs font-medium text-muted-foreground">
								{exigeCliente
									? "Cliente (obrigatório no a prazo)"
									: "Cliente (opcional)"}
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
													<span className="font-medium">
														{rotuloCliente(item)}
													</span>
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

						{permitirDesconto ? (
							painelDesconto ? (
								<form
									className="space-y-2 rounded-md border bg-background p-3"
									onSubmit={(e) => {
										e.preventDefault();
										void aplicarDesconto();
									}}
								>
									<p className="text-sm font-medium">Desconto</p>
									<div className="flex gap-2">
										<Button
											type="button"
											size="sm"
											variant={descontoPercentual ? "outline" : "default"}
											onClick={() => setDescontoPercentual(false)}
										>
											R$
										</Button>
										<Button
											type="button"
											size="sm"
											variant={descontoPercentual ? "default" : "outline"}
											onClick={() => setDescontoPercentual(true)}
										>
											%
										</Button>
									</div>
									<Input
										autoFocus
										inputMode="decimal"
										placeholder={
											descontoPercentual
												? "Percentual (ex.: 10)"
												: "Valor em reais"
										}
										value={descontoInput}
										onChange={(e) => setDescontoInput(e.target.value)}
										disabled={ocupado}
									/>
									<Input
										type="password"
										placeholder="Senha gerencial"
										value={senhaDesconto}
										onChange={(e) => setSenhaDesconto(e.target.value)}
										disabled={ocupado}
									/>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="outline"
											className="flex-1"
											disabled={ocupado}
											onClick={() => {
												setPainelDesconto(false);
												setSenhaDesconto("");
											}}
										>
											Cancelar
										</Button>
										<Button
											type="submit"
											className="flex-1"
											disabled={
												ocupado || !descontoInput.trim() || !senhaDesconto
											}
										>
											Aplicar
										</Button>
									</div>
								</form>
							) : (
								<div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
									<div className="min-w-0 text-sm">
										{descontoAplicado > 0 ? (
											<span className="font-medium">
												Desconto {money(descontoAplicado)}
											</span>
										) : (
											<span className="text-muted-foreground">
												Desconto com senha gerencial
											</span>
										)}
									</div>
									<div className="flex shrink-0 gap-1">
										{descontoAplicado > 0 ? (
											<Button
												type="button"
												size="sm"
												variant="ghost"
												disabled={ocupado}
												onClick={() => limparDesconto()}
											>
												Limpar
											</Button>
										) : null}
										<Button
											type="button"
											size="sm"
											variant="outline"
											disabled={ocupado}
											onClick={() => abrirPainelDesconto()}
										>
											{descontoAplicado > 0 ? "Alterar" : "Desconto"}
											{teclas.desconto ? (
												<span className="ml-1 text-[10px] font-semibold opacity-70">
													{teclas.desconto}
												</span>
											) : null}
										</Button>
									</div>
								</div>
							)
						) : null}

						<div className="rounded-md border bg-background px-3 py-3 text-center">
							<div className="text-xs text-muted-foreground">
								Valor a lançar
							</div>
							<div className="text-3xl font-bold text-primary">
								{money(centavosToNumber(digitos))}
							</div>
							{troco > 0 ? (
								<p className="mt-1 text-sm font-medium">
									Troco: <span className="text-primary">{money(troco)}</span>
								</p>
							) : null}
						</div>

						<div className="flex items-center justify-between gap-2">
							<p className="text-xs text-muted-foreground">
								{mostrarTeclado
									? "Teclado virtual e físico lançam o valor."
									: "Digite o valor no teclado físico."}
							</p>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => setMostrarTeclado((atual) => !atual)}
							>
								{mostrarTeclado ? "Ocultar teclado" : "Mostrar teclado"}
							</Button>
						</div>
						<NumericKeypad
							digits={digitos}
							onChange={setDigitos}
							disabled={ocupado}
							onEnter={() => void aoEnter()}
							mostrarBotoes={mostrarTeclado}
						/>
					</div>

					<div className="space-y-3">
						{pendenteBandeira ? (
							<div className="space-y-2 rounded-md border bg-background p-3">
								<p className="text-sm font-medium">Bandeira do cartão</p>
								<div className="grid grid-cols-2 gap-2">
									{bandeiras.map((bandeira) => (
										<Button
											key={bandeira.id}
											variant="outline"
											disabled={ocupado}
											onClick={() =>
												void adicionar(pendenteBandeira, bandeira.descricao)
											}
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
							<div className="grid grid-cols-2 gap-2">
								{meios.map((botao) => {
									const atalho = atalhosMeios[botao.id];
									return (
										<Button
											key={botao.id}
											variant="outline"
											className="h-auto min-h-14 py-2"
											disabled={
												ocupado || (restante <= 0 && botao.meio !== "DINHEIRO")
											}
											onClick={() => void adicionar(botao)}
										>
											<span className="flex flex-col items-center leading-tight">
												<span>
													{botao.meio === "CARTAO" && sitef?.disponivel
														? `${botao.label}/SiTef`
														: botao.label}
												</span>
												{botao.aprazo === 1 ? (
													<span className="text-[10px] font-medium opacity-70">
														A prazo
													</span>
												) : null}
												{atalho ? (
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

						<div className="min-h-20 space-y-1 rounded-md border bg-background p-2">
							{lancamentos.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Nenhum lançamento. Escolha um meio até zerar o restante.
								</p>
							) : (
								lancamentos.map((item, indice) => (
									<div
										key={item.id ?? `${item.meio}-${indice}`}
										className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-sm"
									>
										<div className="min-w-0">
											<div className="font-medium">
												{rotuloMeio(item.meio, item.descricao)} ·{" "}
												{money(item.valor)}
											</div>
											{(item.nsu || item.autorizacao || item.bandeira) && (
												<div className="text-xs text-muted-foreground">
													{[
														item.bandeira,
														item.nsu ? `NSU ${item.nsu}` : null,
														item.autorizacao
															? `Aut. ${item.autorizacao}`
															: null,
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
								Pago {money(pago)} de {money(totalLiquido)}
							</p>
						)}
					</div>
				</div>

				{erro && <p className="px-5 pb-2 text-sm text-destructive">{erro}</p>}
				<div className="flex gap-2 border-t px-5 py-4">
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

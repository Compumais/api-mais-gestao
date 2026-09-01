import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	useLocation,
	useNavigate,
	useOutletContext,
	useParams,
} from "react-router-dom";
import { totalFatiaItensSelecionados } from "@/lib/conta-gourmet";
import { normalizarObservacaoItem } from "@/lib/observacao-item";
import { normalizarObservacaoPedido } from "@/lib/observacao-pedido";
import { arredondarDinheiro } from "@/lib/pagamento";
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
import { DialogMaisAcoesMesa } from "@/ui/components/dialog-mais-acoes-mesa";
import { DialogObservacaoItem } from "@/ui/components/dialog-observacao-item";
import { DialogObservacaoPedido } from "@/ui/components/dialog-observacao-pedido";
import {
	DialogPagamentoMisto,
	type FechamentoMisto,
} from "@/ui/components/dialog-pagamento-misto";
import {
	DialogPizzaMeioAMeio,
	type ItemPizzaMeioAMeio,
} from "@/ui/components/dialog-pizza-meio-a-meio";
import { DialogQuantidadePeso } from "@/ui/components/dialog-quantidade-peso";
import { DialogReimprimirPedidos } from "@/ui/components/dialog-reimprimir-pedidos";
import { DialogRejeicaoNfce } from "@/ui/components/dialog-rejeicao-nfce";
import { DialogSenhaGerencial } from "@/ui/components/dialog-senha-gerencial";
import { FunctionBar } from "@/ui/components/function-bar";
import { ProdutoCard } from "@/ui/components/produto-card";
import { SideNav } from "@/ui/components/side-nav";
import { Topbar } from "@/ui/components/topbar";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";
import { useTeclasFuncao } from "@/ui/hooks/use-teclas-funcao";

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
	valorentrega?: number;
	taxa_ativa?: number;
	valorpago?: number;
	valorrestante?: number;
	modalidade?: "mesa" | "delivery" | "retirada";
	telefone?: string | null;
	endereco?: string | null;
	bairro?: string | null;
	complemento?: string | null;
	referencia?: string | null;
	status_entrega?: string | null;
	senha_chamada?: string | null;
	orderidintegracao?: string | null;
	itens: Array<{
		id: string;
		idproduto: string;
		descricao: string;
		quantidade: number;
		precounitario: number;
		precototal: number;
		observacao?: string | null;
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
	observacao?: string | null;
};

type LocationState = {
	nomecliente?: string | null;
};

function classeLinhaItemSelecionavel(marcado: boolean) {
	return marcado
		? "bg-primary/20 text-foreground ring-2 ring-primary"
		: "bg-background ring-1 ring-foreground/10";
}

export function MesaContaPage() {
	const { numero, id: idContaParam } = useParams<{
		numero?: string;
		id?: string;
	}>();
	const navigate = useNavigate();
	const location = useLocation();
	const { status } = useOutletContext<StatusContext>();
	const modoEntrega = Boolean(idContaParam);
	const numeroMesa = Number(numero);
	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const nomeDoState = (location.state as LocationState | null)?.nomecliente;
	const { teclas } = useTeclasFuncao();

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
	const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
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
	const [pagarItensAberto, setPagarItensAberto] = useState(false);
	const [modoDividir, setModoDividir] = useState<"pessoas" | "valor" | "itens">(
		"pessoas",
	);
	const [qtdPessoasDiv, setQtdPessoasDiv] = useState("2");
	const [valoresDiv, setValoresDiv] = useState("50,50");
	const [itensSel, setItensSel] = useState<string[]>([]);
	const [fatiaValor, setFatiaValor] = useState<number | null>(null);
	const [pagandoFatia, setPagandoFatia] = useState(false);
	const [taxaEntregaEdit, setTaxaEntregaEdit] = useState("");
	const [reimprimirAberto, setReimprimirAberto] = useState(false);
	const [obsFilaChave, setObsFilaChave] = useState<string | null>(null);
	const [obsPedidoAberto, setObsPedidoAberto] = useState(false);
	const [maisAcoesAberto, setMaisAcoesAberto] = useState(false);
	const [itemCancelar, setItemCancelar] = useState<
		ContaMesa["itens"][number] | null
	>(null);
	const [senhaCancelarItem, setSenhaCancelarItem] = useState("");
	const [exigeSenhaItem, setExigeSenhaItem] = useState(false);

	useEscapeFechaModal(confirmandoSaida, () => setConfirmandoSaida(false));
	useEscapeFechaModal(confirmandoCancelar, () => setConfirmandoCancelar(false));
	useEscapeFechaModal(Boolean(rejeicaoNfce), () => setRejeicaoNfce(null));
	useEscapeFechaModal(Boolean(pizzaPrimeiro), () => setPizzaPrimeiro(null));
	useEscapeFechaModal(dividirAberto, () => setDividirAberto(false));
	useEscapeFechaModal(pagarItensAberto, () => setPagarItensAberto(false));
	useEscapeFechaModal(Boolean(produtoPeso), () => setProdutoPeso(null));
	useEscapeFechaModal(Boolean(obsFilaChave), () => setObsFilaChave(null));
	useEscapeFechaModal(obsPedidoAberto, () => setObsPedidoAberto(false));
	useEscapeFechaModal(Boolean(itemCancelar), () => setItemCancelar(null));

	// biome-ignore lint/correctness/useExhaustiveDependencies: iniciar deve reexecutar apenas quando a mesa/conta muda
	useEffect(() => {
		void iniciar();
		void Promise.all([
			pdvInvoke<GrupoLocal[]>("listarGruposGourmet"),
			pdvInvoke<ProdutoLocal[]>("listarAtalhos"),
		]).then(([g, a]) => {
			setGrupos(g);
			setAtalhos(a);
		});
	}, [numeroMesa, idContaParam]);

	// Intercepta Escape global quando há itens na fila (antes do voltar automático).
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "Escape") return;
			if (
				pagando ||
				confirmandoSaida ||
				confirmandoCancelar ||
				obsFilaChave ||
				obsPedidoAberto ||
				maisAcoesAberto ||
				itemCancelar
			)
				return;
			if (fila.length === 0) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			setConfirmandoSaida(true);
		}
		window.addEventListener("keydown", onKeyDown, true);
		return () => window.removeEventListener("keydown", onKeyDown, true);
	}, [
		fila.length,
		pagando,
		confirmandoSaida,
		confirmandoCancelar,
		obsFilaChave,
		obsPedidoAberto,
		maisAcoesAberto,
		itemCancelar,
	]);

	async function iniciar() {
		setPronto(false);
		setMsg("");
		setFila([]);
		try {
			if (modoEntrega && idContaParam) {
				const existente = await pdvInvoke<ContaMesa | null>(
					"obterContaMesa",
					idContaParam,
				);
				if (!existente) {
					throw new Error("Pedido não encontrado");
				}
				setConta(existente);
				setNomeCliente(existente.nomecliente);
				setTaxaEntregaEdit(String(existente.valorentrega ?? 0));
			} else {
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
			}
		} catch (err) {
			setMsg(
				err instanceof Error
					? err.message
					: modoEntrega
						? "Erro ao carregar o pedido"
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
				(i) =>
					i.idproduto === produto.id &&
					!i.idprodutomeio &&
					!i.pesado &&
					!i.observacao?.trim(),
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

	function aplicarObservacaoFila(observacao: string | null) {
		const chave = obsFilaChave;
		setObsFilaChave(null);
		if (!chave) return;
		setFila((prev) =>
			prev.map((item) =>
				item.chave === chave ? { ...item, observacao } : item,
			),
		);
	}

	function limparFila() {
		if (fila.length === 0) return;
		setFila([]);
		setGrupoAtivo(null);
		setMsg("Fila limpa.");
	}

	function solicitarCancelarMesa() {
		if (modoEntrega || loading || pagando) return;
		if (!conta && fila.length === 0) return;
		setConfirmandoCancelar(true);
	}

	async function confirmarCancelarMesa() {
		setConfirmandoCancelar(false);
		setLoading(true);
		setMsg("");
		try {
			if (conta?.id) {
				await pdvInvoke("cancelarContaMesa", conta.id);
			}
			setFila([]);
			setConta(null);
			setGrupoAtivo(null);
			navigate("/", { replace: true });
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Falha ao cancelar");
		} finally {
			setLoading(false);
		}
	}

	async function solicitarCancelarItem(item: ContaMesa["itens"][number]) {
		if (loading || pagando) return;
		setSenhaCancelarItem("");
		try {
			const definida = await pdvInvoke<boolean>("senhaGerencialDefinida");
			setExigeSenhaItem(Boolean(definida));
		} catch {
			setExigeSenhaItem(false);
		}
		setItemCancelar(item);
	}

	async function confirmarCancelarItem() {
		if (!conta || !itemCancelar) return;
		if (exigeSenhaItem && !senhaCancelarItem.trim()) return;
		const alvo = itemCancelar;
		setLoading(true);
		setMsg("");
		try {
			const atualizada = await pdvInvoke<ContaMesa>(
				"cancelarItemConta",
				conta.id,
				alvo.id,
				exigeSenhaItem ? senhaCancelarItem : undefined,
			);
			setConta(atualizada);
			setItensSel((prev) => prev.filter((id) => id !== alvo.id));
			setItemCancelar(null);
			setSenhaCancelarItem("");
			setMsg(
				`Item cancelado: ${formatarQuantidade(alvo.quantidade)}x ${alvo.descricao}.`,
			);
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Falha ao cancelar item");
		} finally {
			setLoading(false);
		}
	}

	async function confirmarFilaNaConta(observacaoPedido?: string | null) {
		if (fila.length === 0) return;
		setObsPedidoAberto(false);
		setLoading(true);
		setMsg("");
		const obsPedido = normalizarObservacaoPedido(observacaoPedido);
		const itensPayload = fila.map((item) => ({
			idproduto: item.idproduto,
			quantidade: item.quantidade,
			observacao: normalizarObservacaoItem(item.observacao),
			idprodutomeio: item.idprodutomeio ?? null,
		}));
		try {
			let atualizada: ContaMesa | null = conta;
			if (modoEntrega) {
				if (!conta?.id) {
					throw new Error("Pedido inválido");
				}
				atualizada = await pdvInvoke<ContaMesa>(
					"enviarPedidoConta",
					conta.id,
					crypto.randomUUID(),
					itensPayload,
					obsPedido,
				);
				if (conta.status_entrega === "recebido") {
					atualizada = await pdvInvoke<ContaMesa>(
						"atualizarStatusEntrega",
						conta.id,
						"producao",
					);
				}
			} else {
				let idconta = conta?.id;
				if (!idconta) {
					const aberta = await pdvInvoke<ContaMesa>(
						"abrirContaMesa",
						numeroMesa,
						nomeCliente ?? undefined,
					);
					idconta = aberta.id;
				}
				atualizada = await pdvInvoke<ContaMesa>(
					"enviarPedidoConta",
					idconta,
					crypto.randomUUID(),
					itensPayload,
					obsPedido,
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

	function solicitarEnviarFila() {
		if (fila.length === 0 || loading) return;
		setObsPedidoAberto(true);
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
			if ((fechamento.desconto ?? 0) > 0.009) {
				await pdvInvoke<ContaMesa>("aplicarAjustesConta", conta.id, {
					desconto: arredondarDinheiro(
						(conta.valordesconto ?? 0) + fechamento.desconto,
					),
					senha: fechamento.senhaGerencial ?? "",
				});
			}
			const result = await pdvInvoke<{
				venda: { id: string };
				fiscal: { modo: string; mensagem: string; cStat?: string };
			}>(
				"fecharContaMesa",
				conta.id,
				fechamento.lancamentos,
				fechamento.troco,
				fechamento.cliente,
			);
			setPagando(false);
			if (result.fiscal.modo === "erro") {
				setVendaRejeitadaId(result.venda.id);
				setRejeicaoNfce(result.fiscal.mensagem);
				setMsg(result.fiscal.mensagem);
				return;
			}
			setMsg(result.fiscal.mensagem);
			navigate(modoEntrega ? "/delivery" : "/", { replace: true });
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

	function abrirDesconto() {
		if (!conta?.itens.length || loading || pagando) return;
		setDescontoPendente(conta.valordesconto ? String(conta.valordesconto) : "");
		setSenhaAberta(true);
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

	function totalDosItensSelecionados(): number {
		if (!conta || !itensSel.length) return 0;
		return totalFatiaItensSelecionados(
			conta.itens.map((i) => ({ id: i.id, precototal: i.precototal })),
			itensSel,
			{
				subtotal: conta.subtotal ?? conta.valortotal,
				valordesconto: conta.valordesconto ?? 0,
				valortaxaservico: conta.valortaxaservico ?? 0,
				valorcouvert: conta.valorcouvert ?? 0,
				valorentrega: conta.valorentrega ?? 0,
				valortotal: conta.valortotal,
			},
		);
	}

	function abrirPagarPorItens() {
		if (!conta?.itens.length) return;
		setPagarItensAberto(true);
	}

	function confirmarSelecaoItensParaPagamento() {
		if (!conta) return;
		if (!itensSel.length) {
			setMsg("Selecione os itens que esta pessoa vai pagar.");
			return;
		}
		const valor = totalDosItensSelecionados();
		if (valor <= 0) {
			setMsg("O valor dos itens selecionados é zero.");
			return;
		}
		setFatiaValor(valor);
		setPagarItensAberto(false);
		setDividirAberto(false);
		setPagandoFatia(true);
		setPagando(true);
		setMsg("");
	}

	function abrirPagamentoFatia() {
		if (!conta) return;
		const restante = conta.valorrestante ?? conta.valortotal;
		if (modoDividir === "itens") {
			confirmarSelecaoItensParaPagamento();
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
			if (itensSel.length > 0) {
				const result = await pdvInvoke<{
					conta: ContaMesa | null;
					venda: { id: string };
				}>(
					"fecharFatiaItens",
					conta.id,
					itensSel,
					fechamento.lancamentos,
					fechamento.troco,
					fechamento.cliente,
				);
				setPagando(false);
				setPagandoFatia(false);
				setFatiaValor(null);
				setItensSel([]);
				if (!result.conta) {
					navigate("/", { replace: true });
					return;
				}
				setConta(result.conta);
				setMsg(
					`Itens recebidos. Restante ${money(result.conta.valorrestante ?? 0)}.`,
				);
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
			setPagandoFatia(false);
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
	const totalSelecionado = useMemo(() => {
		if (!conta || !itensSel.length) return 0;
		return totalFatiaItensSelecionados(
			conta.itens.map((i) => ({ id: i.id, precototal: i.precototal })),
			itensSel,
			{
				subtotal: conta.subtotal ?? conta.valortotal,
				valordesconto: conta.valordesconto ?? 0,
				valortaxaservico: conta.valortaxaservico ?? 0,
				valorcouvert: conta.valorcouvert ?? 0,
				valorentrega: conta.valorentrega ?? 0,
				valortotal: conta.valortotal,
			},
		);
	}, [conta, itensSel]);
	const totalPagar = fatiaValor ?? total;
	const totalFila = useMemo(
		() => fila.reduce((acc, i) => acc + i.precototal, 0),
		[fila],
	);
	const identificacao = nomeCliente || "Sem identificação";
	const tituloConta = modoEntrega
		? `${conta?.modalidade === "retirada" ? "Retirada" : "Delivery"} #${conta?.senha_chamada ?? "—"}`
		: `${rotulo.singular} ${numeroMesa}`;

	return (
		<div className="flex h-screen flex-col">
			<Topbar
				title={tituloConta}
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

			<div className="flex min-h-0 flex-1 gap-3 overflow-hidden bg-muted/30 p-3">
				<div className="grid min-h-0 min-w-0 flex-1 grid-cols-[1fr_340px] gap-3 overflow-hidden">
					<div className="pdv-surface flex min-h-0 flex-col gap-3 overflow-hidden p-3">
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
								confirmandoCancelar ||
								Boolean(rejeicaoNfce) ||
								Boolean(pizzaPrimeiro) ||
								Boolean(produtoPeso) ||
								Boolean(obsFilaChave) ||
								obsPedidoAberto ||
								maisAcoesAberto ||
								senhaAberta ||
								Boolean(itemCancelar)
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
									<h2 className="mb-2 text-sm font-semibold">
										Escolha o grupo
									</h2>
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

					<div className="pdv-surface flex min-h-0 flex-col overflow-hidden p-3">
						<h2 className="mb-2 shrink-0 text-sm font-semibold">
							Fila ({fila.length} {fila.length === 1 ? "item" : "itens"})
						</h2>

						<div className="min-h-0 flex-1 space-y-1 overflow-auto">
							{fila.map((item) => (
								<div
									key={item.chave}
									className="rounded-md border bg-background px-2 py-2 text-sm"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="line-clamp-2 min-w-0 font-medium">
											{item.descricao}
										</div>
										<Button
											size="sm"
											variant={item.observacao ? "secondary" : "outline"}
											disabled={loading}
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
									Selecione produtos à esquerda para montar a fila. Depois
									clique em Adicionar itens.
								</p>
							)}

							{itens.length > 0 && (
								<div className="mt-3 border-t pt-3">
									<div className="mb-2 flex items-center justify-between gap-2">
										<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
											Já na conta
										</h3>
										{itensSel.length > 0 ? (
											<button
												type="button"
												className="text-xs text-primary underline"
												onClick={() => setItensSel([])}
											>
												Limpar seleção
											</button>
										) : (
											<button
												type="button"
												className="text-xs text-muted-foreground underline"
												onClick={() => setItensSel(itens.map((i) => i.id))}
											>
												Selecionar todos
											</button>
										)}
									</div>
									{itens.map((item) => {
										const marcado = itensSel.includes(item.id);
										return (
											<div
												key={item.id}
												className={`mb-1 flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm ${classeLinhaItemSelecionavel(marcado)}`}
											>
												<label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
													<input
														type="checkbox"
														className="size-4 shrink-0 accent-primary"
														checked={marcado}
														onChange={(e) => {
															setItensSel((prev) =>
																e.target.checked
																	? [...prev, item.id]
																	: prev.filter((id) => id !== item.id),
															);
														}}
													/>
													<span className="min-w-0">
														<span className="block truncate font-medium text-foreground">
															{formatarQuantidade(item.quantidade)}x{" "}
															{item.descricao}
														</span>
														{item.observacao ? (
															<span className="block truncate text-xs text-muted-foreground">
																{item.observacao}
															</span>
														) : null}
													</span>
												</label>
												<span className="flex shrink-0 items-center gap-1">
													<span className="font-semibold tabular-nums">
														{money(item.precototal)}
													</span>
													<Button
														type="button"
														size="icon"
														variant="ghost"
														className="size-8 text-destructive"
														disabled={loading}
														aria-label={`Cancelar ${item.descricao}`}
														onClick={() => void solicitarCancelarItem(item)}
													>
														<X className="size-4" />
													</Button>
												</span>
											</div>
										);
									})}
									{itensSel.length > 0 && (
										<div className="mt-2 flex items-center justify-between rounded-md bg-primary/10 px-2 py-1.5 text-sm font-semibold">
											<span>
												{itensSel.length}{" "}
												{itensSel.length === 1 ? "item" : "itens"}
											</span>
											<span className="text-primary">
												{money(totalSelecionado)}
											</span>
										</div>
									)}
								</div>
							)}
						</div>

						<div className="mt-2 shrink-0 space-y-1 border-t pt-2 text-sm">
							{fila.length > 0 && (
								<div className="flex justify-between font-medium">
									<span>Subtotal fila</span>
									<span className="text-primary">{money(totalFila)}</span>
								</div>
							)}
							{conta && (
								<>
									{modoEntrega ? (
										<div className="space-y-0.5 text-xs text-muted-foreground">
											{conta.telefone ? <div>Tel: {conta.telefone}</div> : null}
											{conta.endereco ? (
												<div className="line-clamp-2">
													{conta.endereco}
													{conta.bairro ? ` — ${conta.bairro}` : ""}
												</div>
											) : null}
											<div>
												Status: {conta.status_entrega ?? "recebido"}
												{conta.orderidintegracao
													? ` · ${conta.orderidintegracao}`
													: ""}
											</div>
											<div className="flex items-center justify-between gap-2 pt-1">
												<span>Taxa entrega</span>
												<Input
													className="h-8 w-20"
													value={taxaEntregaEdit}
													disabled={loading}
													onChange={(e) => setTaxaEntregaEdit(e.target.value)}
													onBlur={() => {
														const n = Number(taxaEntregaEdit.replace(",", "."));
														if (!Number.isFinite(n) || !conta) return;
														void pdvInvoke<ContaMesa>(
															"aplicarTaxaEntrega",
															conta.id,
															n,
														).then((c) => {
															setConta(c);
															setTaxaEntregaEdit(String(c.valorentrega ?? 0));
														});
													}}
												/>
											</div>
										</div>
									) : (
										<div className="flex items-center justify-between gap-3 text-xs">
											<div className="flex items-center gap-1.5">
												<span>Pessoas</span>
												<Input
													type="number"
													min={1}
													className="h-8 w-14"
													value={conta.numeropessoas ?? 1}
													disabled={!conta || loading}
													onChange={(e) =>
														void aplicarAjustes({
															numeropessoas: Number(e.target.value),
														})
													}
												/>
											</div>
											<label className="flex items-center gap-1.5">
												<span>Taxa</span>
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
										</div>
									)}
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
									{(conta.valorentrega ?? 0) > 0 && (
										<div className="flex justify-between text-xs text-muted-foreground">
											<span>Entrega</span>
											<span>{money(conta.valorentrega ?? 0)}</span>
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
						{msg ? (
							<p
								className={
									rejeicaoNfce
										? "mt-1 shrink-0 line-clamp-2 text-sm text-destructive"
										: "mt-1 shrink-0 line-clamp-2 text-sm text-muted-foreground"
								}
							>
								{msg}
							</p>
						) : null}
						<div className="mt-2 grid shrink-0 grid-cols-2 gap-2">
							<Button
								size="lg"
								variant="default"
								className="w-full"
								disabled={fila.length === 0 || loading}
								onClick={() => solicitarEnviarFila()}
							>
								{loading ? "Adicionando..." : "Adicionar itens"}
							</Button>
							<Button
								size="lg"
								variant="secondary"
								className="w-full"
								disabled={!itens.length || fila.length > 0 || loading}
								onClick={() => {
									setPagandoFatia(false);
									setFatiaValor(null);
									setPagando(true);
								}}
							>
								Receber
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="w-full"
								onClick={() => tentarSair()}
							>
								Voltar
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="w-full"
								disabled={loading || pagando}
								onClick={() => setMaisAcoesAberto(true)}
							>
								Mais ações
							</Button>
						</div>
					</div>
				</div>
				<SideNav status={status} />
			</div>

			{confirmandoSaida && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="pdv-surface w-96 space-y-4 p-5">
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

			{confirmandoCancelar && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="pdv-surface w-96 space-y-4 p-5">
						<h2 className="text-lg font-semibold">
							Cancelar {rotulo.singular}
						</h2>
						<p className="text-sm text-muted-foreground">
							{conta
								? `Os itens da ${rotulo.singular.toLowerCase()} serão desconsiderados, ela será liberada e removida da catraca. Esta ação não pode ser desfeita.`
								: `Há itens apenas na fila. Ao cancelar, a fila será descartada e você voltará ao salão.`}
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => setConfirmandoCancelar(false)}
							>
								Voltar
							</Button>
							<Button
								variant="destructive"
								className="flex-1"
								disabled={loading}
								onClick={() => void confirmarCancelarMesa()}
							>
								Confirmar cancelamento
							</Button>
						</div>
					</div>
				</div>
			)}

			{itemCancelar && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<form
						className="pdv-surface w-96 space-y-4 p-5"
						onSubmit={(e) => {
							e.preventDefault();
							void confirmarCancelarItem();
						}}
					>
						<h2 className="text-lg font-semibold">Cancelar item</h2>
						<p className="text-sm text-muted-foreground">
							Remover da conta{" "}
							<span className="font-medium text-foreground">
								{formatarQuantidade(itemCancelar.quantidade)}x{" "}
								{itemCancelar.descricao}
							</span>{" "}
							({money(itemCancelar.precototal)})? Esta ação não pode ser
							desfeita.
						</p>
						{exigeSenhaItem ? (
							<Input
								type="password"
								autoFocus
								value={senhaCancelarItem}
								onChange={(e) => setSenhaCancelarItem(e.target.value)}
								placeholder="Senha gerencial"
							/>
						) : null}
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								className="flex-1"
								onClick={() => setItemCancelar(null)}
							>
								Voltar
							</Button>
							<Button
								type="submit"
								variant="destructive"
								className="flex-1"
								disabled={
									loading || (exigeSenhaItem && !senhaCancelarItem.trim())
								}
							>
								Cancelar item
							</Button>
						</div>
					</form>
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
				titulo={
					pagandoFatia && itensSel.length
						? `Pagar ${itensSel.length} ${itensSel.length === 1 ? "item" : "itens"}`
						: pagandoFatia
							? "Receber fatia"
							: "Receber / fechar conta"
				}
				confirmarLabel="Confirmar"
				nomeClienteHint={nomeCliente}
				permitirDesconto={!pagandoFatia}
				descontoJaAplicado={conta?.valordesconto ?? 0}
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
					<div className="pdv-surface w-[28rem] max-w-[95vw] space-y-4 p-5">
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
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">
									Marque na lista da conta (painel direito) os itens desta
									pessoa, ou use o botão &quot;Pagar por itens&quot;.
								</p>
								{itensSel.length > 0 ? (
									<p className="text-sm font-semibold text-primary">
										{itensSel.length} selecionado(s) · {money(totalSelecionado)}
									</p>
								) : null}
							</div>
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

			<DialogReimprimirPedidos
				aberto={reimprimirAberto}
				idconta={conta?.id}
				onFechar={() => setReimprimirAberto(false)}
				onMensagem={setMsg}
			/>
			{pagarItensAberto && conta && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
					<div className="pdv-surface flex max-h-[90vh] w-[28rem] max-w-[95vw] flex-col space-y-3 p-5">
						<div>
							<h2 className="text-lg font-semibold">Pagar por itens</h2>
							<p className="text-sm text-muted-foreground">
								Selecione o que esta pessoa consumiu. Taxa, desconto e demais
								ajustes são rateados automaticamente.
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => setItensSel(itens.map((i) => i.id))}
							>
								Todos
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => setItensSel([])}
							>
								Nenhum
							</Button>
						</div>
						<div className="min-h-0 flex-1 space-y-1 overflow-auto">
							{itens.map((item) => {
								const marcado = itensSel.includes(item.id);
								return (
									<label
										key={item.id}
										className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-3 text-sm ${classeLinhaItemSelecionavel(marcado)}`}
									>
										<span className="flex min-w-0 flex-1 items-center gap-3">
											<input
												type="checkbox"
												className="size-5 shrink-0 accent-primary"
												checked={marcado}
												onChange={(e) => {
													setItensSel((prev) =>
														e.target.checked
															? [...prev, item.id]
															: prev.filter((id) => id !== item.id),
													);
												}}
											/>
											<span className="font-medium">
												{formatarQuantidade(item.quantidade)}x {item.descricao}
											</span>
										</span>
										<span className="shrink-0 font-semibold tabular-nums">
											{money(item.precototal)}
										</span>
									</label>
								);
							})}
						</div>
						<div className="flex items-center justify-between border-t pt-2 text-base font-bold">
							<span>A receber nesta fatia</span>
							<span className="text-primary">{money(totalSelecionado)}</span>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => setPagarItensAberto(false)}
							>
								Cancelar
							</Button>
							<Button
								className="flex-1"
								disabled={!itensSel.length || loading}
								onClick={() => confirmarSelecaoItensParaPagamento()}
							>
								Receber itens
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
						onClick: () => solicitarEnviarFila(),
					},
					{
						key: "cancelar",
						label: `Cancelar ${rotulo.singular}`,
						hotkey: "F3",
						variant: "outline",
						disabled:
							modoEntrega ||
							loading ||
							pagando ||
							confirmandoCancelar ||
							(!conta && fila.length === 0),
						onClick: () => solicitarCancelarMesa(),
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
						key: "reimprimir",
						label: "Reimprimir",
						hotkey: "F7",
						variant: "outline",
						disabled: !conta || loading,
						onClick: () => setReimprimirAberto(true),
					},
					{
						key: "observacao",
						label: "Observação",
						hotkey: "F5",
						variant: "outline",
						disabled: fila.length === 0 || loading,
						onClick: () => {
							const ultimo = fila[fila.length - 1];
							if (ultimo) setObsFilaChave(ultimo.chave);
						},
					},
					{
						key: "desconto",
						label: "Desconto",
						hotkey: teclas.desconto,
						variant: "outline",
						disabled: !itens.length || loading || pagando || senhaAberta,
						onClick: () => abrirDesconto(),
					},
					{
						key: "receber",
						label: "Receber",
						hotkey: teclas.receber,
						variant: "secondary",
						disabled: !itens.length || fila.length > 0 || loading || pagando,
						onClick: () => {
							setPagandoFatia(false);
							setFatiaValor(null);
							setPagando(true);
						},
					},
					{
						key: "pagar-itens",
						label: "Pagar itens",
						hotkey: "F8",
						variant: "outline",
						disabled:
							!itens.length ||
							fila.length > 0 ||
							loading ||
							pagando ||
							pagarItensAberto,
						onClick: () => abrirPagarPorItens(),
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
			<DialogMaisAcoesMesa
				aberto={maisAcoesAberto}
				onFechar={() => setMaisAcoesAberto(false)}
				acoes={[
					{
						key: "observacao",
						label: "Observação",
						hotkey: "F5",
						disabled: fila.length === 0 || loading,
						onClick: () => {
							const ultimo = fila[fila.length - 1];
							if (ultimo) setObsFilaChave(ultimo.chave);
						},
					},
					{
						key: "limpar-fila",
						label: "Limpar fila",
						disabled: fila.length === 0 || loading,
						onClick: () => limparFila(),
					},
					{
						key: "cancelar-item",
						label: "Cancelar item",
						variant: "destructive" as const,
						disabled: itensSel.length !== 1 || loading || pagando,
						onClick: () => {
							const item = itens.find((i) => i.id === itensSel[0]);
							if (item) void solicitarCancelarItem(item);
						},
					},
					{
						key: "pagar-itens",
						label: itensSel.length
							? `Pagar ${itensSel.length} itens (${money(totalSelecionado)})`
							: "Pagar por itens",
						hotkey: "F8",
						disabled: !itens.length || fila.length > 0 || loading || pagando,
						onClick: () => abrirPagarPorItens(),
					},
					{
						key: "preconta",
						label: "Pré-conta",
						hotkey: "F6",
						disabled: !itens.length || loading,
						onClick: () => void preConta(),
					},
					{
						key: "reimprimir",
						label: "Reimprimir",
						hotkey: "F7",
						disabled: !conta || loading,
						onClick: () => setReimprimirAberto(true),
					},
					{
						key: "desconto",
						label: "Desconto",
						hotkey: teclas.desconto,
						disabled: !itens.length || loading || pagando || senhaAberta,
						onClick: () => abrirDesconto(),
					},
					...(modoEntrega
						? [
								{
									key: "avancar-status",
									label: "Avançar status",
									disabled: !conta || loading,
									onClick: () => {
										if (!conta) return;
										void pdvInvoke<ContaMesa>(
											"atualizarStatusEntrega",
											conta.id,
										).then(setConta);
									},
								},
							]
						: [
								{
									key: "dividir",
									label: "Dividir",
									disabled: !itens.length || loading,
									onClick: () => iniciarDivisao(),
								},
								{
									key: "transferir",
									label: "Transferir",
									disabled: !itens.length || loading,
									onClick: () => setDestinoAberto("transferir"),
								},
								{
									key: "juntar",
									label: "Juntar",
									disabled: !itens.length || loading,
									onClick: () => setDestinoAberto("juntar"),
								},
								{
									key: "mover-itens",
									label: "Mover itens",
									disabled: !itensSel.length || loading,
									onClick: () => setDestinoAberto("itens"),
								},
								{
									key: "cancelar",
									label: `Cancelar ${rotulo.singular}`,
									hotkey: "F3",
									variant: "destructive" as const,
									disabled:
										loading ||
										pagando ||
										confirmandoCancelar ||
										(!conta && fila.length === 0),
									onClick: () => solicitarCancelarMesa(),
								},
							]),
				]}
			/>
			<DialogObservacaoItem
				aberto={Boolean(obsFilaChave)}
				descricao={
					fila.find((item) => item.chave === obsFilaChave)?.descricao ?? ""
				}
				valorInicial={
					fila.find((item) => item.chave === obsFilaChave)?.observacao
				}
				onCancelar={() => setObsFilaChave(null)}
				onConfirmar={aplicarObservacaoFila}
			/>
			<DialogObservacaoPedido
				aberto={obsPedidoAberto}
				loading={loading}
				onCancelar={() => setObsPedidoAberto(false)}
				onConfirmar={(observacao) => void confirmarFilaNaConta(observacao)}
			/>
		</div>
	);
}

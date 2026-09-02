import { getConfig } from "../db/database";
import type { LancamentoPagamento, MeioPagamento } from "../db/pagamento";
import type {
	ClienteVenda,
	ContaMesaLocal,
	ItemCarrinho,
	VendaLocal,
} from "../db/repos";
import {
	PrincipalNaoAutorizadoError,
	requisitarPrincipal,
	unwrapDataEnvelope,
	urlDoPrincipal,
} from "./cliente";
import { conectarNoPrincipal, garantirOperacaoSecundario } from "./servico";

const TIMEOUT_OP_MS = 20_000;

type ItemContaInput = {
	idproduto: string;
	descricao: string;
	quantidade: number;
	precounitario: number;
	observacao?: string | null;
};

type ItemPedidoInput = {
	idproduto: string;
	quantidade: number;
	observacao?: string | null;
	idprodutomeio?: string | null;
};

async function conexaoPrincipal(): Promise<{ url: string; token: string }> {
	await garantirOperacaoSecundario();
	const host = await getConfig("pdv_principal_host", "");
	const porta = await getConfig("pdv_principal_porta", "5050");
	if (!host.trim()) {
		throw new Error("Informe o IP do PDV principal nas configurações.");
	}
	let token = (await getConfig("pdv_principal_token", "")).trim();
	const url = urlDoPrincipal(host, porta || "5050");
	if (!token) {
		const hs = await conectarNoPrincipal({ host, porta });
		token = hs.token;
	}
	return { url, token };
}

async function remoto<T>(
	path: string,
	init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
	const { timeoutMs = TIMEOUT_OP_MS, ...resto } = init;
	const tentar = async (): Promise<T> => {
		const { url, token } = await conexaoPrincipal();
		return requisitarPrincipal<T>(url, path, {
			...resto,
			token,
			timeoutMs,
		});
	};
	try {
		return await tentar();
	} catch (err) {
		if (!(err instanceof PrincipalNaoAutorizadoError)) {
			throw err;
		}
		await conectarNoPrincipal();
		return tentar();
	}
}

function jsonBody(body: unknown): RequestInit {
	return {
		method: "POST",
		body: JSON.stringify(body ?? {}),
	};
}

export async function listarMesasRemoto() {
	const body = await remoto<{ data: unknown } | unknown[]>("/pos/mesas");
	return unwrapDataEnvelope(body as { data: unknown[] });
}

export async function obterMesaRemoto(numero: number) {
	return remoto(`/pos/mesas/${numero}`);
}

export async function obterContaPorNumeroRemoto(numero: number) {
	return remoto(`/pos/mesas/${numero}/conta`);
}

export async function abrirContaMesaRemoto(
	numero: number,
	nomecliente?: string,
): Promise<ContaMesaLocal> {
	return remoto(
		`/pos/mesas/${numero}/abrir`,
		jsonBody(nomecliente ? { nomecliente } : {}),
	);
}

export async function adicionarItemNaMesaRemoto(
	numero: number,
	item: ItemContaInput,
	nomecliente?: string,
): Promise<ContaMesaLocal> {
	return remoto(
		`/pos/mesas/${numero}/itens`,
		jsonBody({ ...item, ...(nomecliente ? { nomecliente } : {}) }),
	);
}

export async function limparContasVaziasRemoto(): Promise<number> {
	const body = await remoto<{ removidas?: number } | number>(
		"/pos/mesas/limpar-vazias",
		jsonBody({}),
	);
	if (typeof body === "number") {
		return body;
	}
	return Number((body as { removidas?: number }).removidas ?? 0);
}

export async function obterContaMesaRemoto(
	id: string,
): Promise<ContaMesaLocal | null> {
	return remoto(`/pos/contas/${encodeURIComponent(id)}`);
}

export async function adicionarItemContaRemoto(
	idconta: string,
	item: ItemContaInput,
): Promise<ContaMesaLocal> {
	return remoto(
		`/pos/contas/${encodeURIComponent(idconta)}/itens`,
		jsonBody(item),
	);
}

export async function atualizarNomeClienteContaRemoto(
	idconta: string,
	nomecliente: string,
): Promise<ContaMesaLocal> {
	return remoto(`/pos/contas/${encodeURIComponent(idconta)}/nome`, {
		method: "PUT",
		body: JSON.stringify({ nomecliente }),
	});
}

export async function enviarPedidoContaRemoto(
	idconta: string,
	clientOrderId: string,
	itens: ItemPedidoInput[],
	observacaoPedido?: string | null,
): Promise<ContaMesaLocal & { pedidoNovo?: boolean; itensProducao?: unknown[] }> {
	return remoto(`/pos/contas/${encodeURIComponent(idconta)}/pedido`, {
		method: "POST",
		body: JSON.stringify({ clientOrderId, itens, observacaoPedido }),
	});
}

export async function cancelarContaMesaRemoto(
	idconta: string,
): Promise<{ ok: true }> {
	return remoto(
		`/pos/contas/${encodeURIComponent(idconta)}/cancelar`,
		jsonBody({}),
	);
}

export async function cancelarItemContaRemoto(
	idconta: string,
	iditem: string,
	senha?: string,
): Promise<ContaMesaLocal> {
	return remoto(
		`/pos/contas/${encodeURIComponent(idconta)}/itens/${encodeURIComponent(iditem)}/cancelar`,
		jsonBody(senha != null && senha !== "" ? { senha } : {}),
	);
}

export async function aplicarAjustesContaRemoto(
	idconta: string,
	ajustes: {
		numeropessoas?: number;
		taxaAtiva?: boolean;
		desconto?: number;
		acrescimo?: number;
		senha?: string;
	},
) {
	return remoto(
		`/pos/contas/${encodeURIComponent(idconta)}/ajustes`,
		jsonBody(ajustes),
	);
}

export async function registrarPagamentoContaRemoto(
	idconta: string,
	lancamentos: LancamentoPagamento[],
	troco?: number,
) {
	return remoto(
		`/pos/contas/${encodeURIComponent(idconta)}/pagamento`,
		jsonBody({ lancamentos, troco }),
	);
}

export async function fecharContaMesaRemoto(
	idconta: string,
	lancamentos: LancamentoPagamento[],
	troco?: number,
	cliente?: ClienteVenda | null,
) {
	return remoto(
		`/pos/contas/${encodeURIComponent(idconta)}/fechar`,
		jsonBody({ lancamentos, troco, cliente }),
	);
}

export async function fecharFatiaItensRemoto(
	idconta: string,
	idsItens: string[],
	lancamentos: LancamentoPagamento[],
	troco?: number,
	cliente?: ClienteVenda | null,
) {
	return remoto(
		`/pos/contas/${encodeURIComponent(idconta)}/fatia`,
		jsonBody({ idsItens, lancamentos, troco, cliente }),
	);
}

export async function transferirContaRemoto(
	idconta: string,
	numeroDestino: number,
): Promise<ContaMesaLocal> {
	return remoto(
		`/pos/contas/${encodeURIComponent(idconta)}/transferir`,
		jsonBody({ numeroDestino }),
	);
}

export async function transferirItensRemoto(
	idcontaOrigem: string,
	idsItens: string[],
	numeroDestino: number,
) {
	return remoto(
		`/pos/contas/${encodeURIComponent(idcontaOrigem)}/transferir`,
		jsonBody({ idsItens, numeroDestino }),
	);
}

export async function juntarContasRemoto(
	idOrigem: string,
	numeroDestino: number,
): Promise<ContaMesaLocal> {
	return remoto(
		`/pos/contas/${encodeURIComponent(idOrigem)}/juntar`,
		jsonBody({ numeroDestino }),
	);
}

export async function aplicarTaxaEntregaRemoto(
	idconta: string,
	valorentrega: number,
): Promise<ContaMesaLocal> {
	return remoto(
		`/pos/contas/${encodeURIComponent(idconta)}/taxa-entrega`,
		jsonBody({ valorentrega }),
	);
}

export async function atualizarDadosEntregaRemoto(
	idconta: string,
	dados: {
		nomecliente?: string | null;
		telefone?: string | null;
		endereco?: string | null;
		bairro?: string | null;
		complemento?: string | null;
		referencia?: string | null;
		obs?: string | null;
	},
): Promise<ContaMesaLocal> {
	return remoto(`/pos/delivery/${encodeURIComponent(idconta)}`, {
		method: "PATCH",
		body: JSON.stringify(dados),
	});
}

export async function listarPedidosEntregaRemoto(statusFiltro?: string | null) {
	const qs =
		statusFiltro != null && statusFiltro !== ""
			? `?status=${encodeURIComponent(statusFiltro)}`
			: "";
	const body = await remoto<{ data: unknown }>(`/pos/delivery${qs}`);
	return unwrapDataEnvelope(body);
}

export async function abrirPedidoEntregaRemoto(params: {
	modalidade: "delivery" | "retirada";
	nomecliente?: string | null;
	telefone?: string | null;
	endereco?: string | null;
	bairro?: string | null;
	complemento?: string | null;
	referencia?: string | null;
	valorentrega?: number | null;
	idcliente?: string | null;
	obs?: string | null;
}): Promise<ContaMesaLocal> {
	return remoto("/pos/delivery", jsonBody(params));
}

export async function atualizarStatusEntregaRemoto(
	idconta: string,
	status?: "recebido" | "producao" | "saiu" | "entregue" | null,
) {
	return remoto(
		`/pos/delivery/${encodeURIComponent(idconta)}/status`,
		jsonBody({ status: status ?? null }),
	);
}

export async function listarPedidosFilaRemoto(pendentes: boolean) {
	const qs = `?pendentes=${pendentes ? "1" : "0"}`;
	const body = await remoto<{ data: unknown }>(`/pos/pedidos${qs}`);
	return unwrapDataEnvelope(body);
}

export async function limparFilaPedidosRemoto(): Promise<{ ok: true }> {
	return remoto("/pos/pedidos/limpar-fila", jsonBody({}));
}

export async function marcarPedidoEntregueRemoto(
	id: string,
): Promise<{ ok: true }> {
	return remoto(
		`/pos/pedidos/${encodeURIComponent(id)}/entregue`,
		jsonBody({}),
	);
}

export async function listarVendasRemoto(): Promise<VendaLocal[]> {
	return remoto("/pos/vendas");
}

export async function obterVendaRemoto(id: string): Promise<VendaLocal | null> {
	return remoto(`/pos/vendas/${encodeURIComponent(id)}`);
}

export async function criarVendaRapidaRemoto(input: {
	itens: ItemCarrinho[];
	lancamentos?: LancamentoPagamento[];
	meio?: MeioPagamento;
	troco?: number;
	cliente?: ClienteVenda | null;
	valordesconto?: number;
}) {
	return remoto("/pos/vendas/rapida", {
		method: "POST",
		body: JSON.stringify({
			itens: input.itens,
			lancamentos: input.lancamentos,
			meio: input.meio,
			troco: input.troco,
			cliente: input.cliente,
			desconto: input.valordesconto,
		}),
		timeoutMs: TIMEOUT_OP_MS,
	});
}

export async function inutilizarNfceRemoto(
	vendaId: string,
	justificativa: string,
) {
	return remoto(
		`/pos/vendas/${encodeURIComponent(vendaId)}/inutilizar`,
		{
			...jsonBody({ justificativa }),
			timeoutMs: 60_000,
		},
	);
}

export async function cancelarNfceRemoto(
	vendaId: string,
	justificativa: string,
) {
	return remoto(`/pos/vendas/${encodeURIComponent(vendaId)}/cancelar`, {
		...jsonBody({ justificativa }),
		timeoutMs: 60_000,
	});
}

export async function cancelarVendaNaoFiscalRemoto(
	vendaId: string,
	opts?: { senha?: string; motivo?: string },
) {
	return remoto(
		`/pos/vendas/${encodeURIComponent(vendaId)}/cancelar-nao-fiscal`,
		{
			...jsonBody({
				senha: opts?.senha ?? "",
				motivo: opts?.motivo ?? "",
			}),
			timeoutMs: 60_000,
		},
	);
}

export { unwrapDataEnvelope };

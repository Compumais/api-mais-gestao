import { v4 as uuidv4 } from "uuid";
import { STATUS_COTACAO_COMPRA } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { STATUS_PEDIDO_COMPRA } from "@/model/pedido-compra-model.js";
import type { PedidoCompraCompleto } from "@/model/pedido-compra-model.js";
import {
	atualizarCotacaoCompra,
	buscarCotacaoCompraPorId,
	buscarPropostaPorId,
	contarPedidosPorCotacao,
	listarItensCotacaoCompraEnriquecidos,
	listarItensPropostasCotacao,
} from "@/repositories/cotacao-compra-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarProximoCodigoPedidoCompra,
	criarPedidosCompraEmLote,
	listarItensPedidoCompraEnriquecidos,
} from "@/repositories/pedido-compra-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

type GerarPedidosParametros = {
	id: string;
	idusuario: string;
	itens: Array<{ idcotacaoitem: string; idproposta: string }>;
};

function arredondar(valor: number) {
	return Math.round(valor * 100) / 100;
}

export async function gerarPedidosCotacaoCompraService({
	id,
	idusuario,
	itens,
}: GerarPedidosParametros): Promise<HttpResponse<{ data: PedidoCompraCompleto[] }>> {
	const cotacao = await buscarCotacaoCompraPorId(id);
	if (!cotacao) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		cotacao.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (cotacao.status !== STATUS_COTACAO_COMPRA.ABERTA) {
		return httpBadRequest(
			"Somente cotações abertas podem gerar pedidos de compra",
		);
	}

	if (!itens || itens.length === 0) {
		return httpBadRequest("Selecione ao menos um item para gerar os pedidos");
	}

	const pedidosExistentes = await contarPedidosPorCotacao(id);
	if (pedidosExistentes > 0) {
		return httpBadRequest("Esta cotação já gerou pedidos de compra");
	}

	const [itensCotacao, precos] = await Promise.all([
		listarItensCotacaoCompraEnriquecidos(id),
		listarItensPropostasCotacao(id),
	]);

	const itemPorId = new Map(itensCotacao.map((item) => [item.id, item]));
	const precoPorChave = new Map(
		precos.map((preco) => [`${preco.idproposta}:${preco.idcotacaoitem}`, preco]),
	);

	const itensPorProposta = new Map<
		string,
		Array<{
			idcotacaoitem: string;
			idproduto: string | null;
			descricao: string | null;
			quantidade: string;
			precounitario: string;
			total: string;
		}>
	>();

	for (const selecao of itens) {
		const itemCotacao = itemPorId.get(selecao.idcotacaoitem);
		if (!itemCotacao) {
			return httpBadRequest("Um dos itens selecionados não pertence à cotação");
		}

		const preco = precoPorChave.get(
			`${selecao.idproposta}:${selecao.idcotacaoitem}`,
		);
		if (!preco) {
			return httpBadRequest(
				"Não há proposta de preço para um dos itens selecionados",
			);
		}

		const quantidade = Number(itemCotacao.quantidade);
		const unitario = Number(preco.precounitario);
		const total = arredondar(quantidade * unitario).toFixed(2);

		const lista = itensPorProposta.get(selecao.idproposta) ?? [];
		lista.push({
			idcotacaoitem: itemCotacao.id,
			idproduto: itemCotacao.idproduto,
			descricao:
				itemCotacao.descricao ??
				itemCotacao.nomeproduto ??
				itemCotacao.descricaoproduto,
			quantidade: itemCotacao.quantidade,
			precounitario: unitario.toFixed(2),
			total,
		});
		itensPorProposta.set(selecao.idproposta, lista);
	}

	let codigo = await buscarProximoCodigoPedidoCompra(cotacao.idempresa);
	const agora = Date.now();
	const payloads = [];

	for (const [idproposta, itensPedido] of itensPorProposta) {
		const proposta = await buscarPropostaPorId(idproposta);
		if (!proposta || proposta.idcotacao !== id) {
			return httpBadRequest("Proposta inválida para esta cotação");
		}

		const idPedido = uuidv4();
		const valortotal = itensPedido
			.reduce((acc, item) => acc + Number(item.total), 0)
			.toFixed(2);

		payloads.push({
			cabecalho: {
				id: idPedido,
				idempresa: cotacao.idempresa,
				codigo,
				idcotacao: id,
				idproposta,
				fornecedornome: proposta.nome,
				fornecedortelefone: proposta.telefone,
				valortotal,
				status: STATUS_PEDIDO_COMPRA.ABERTO,
				observacao: null,
				currenttimemillis: agora,
			},
			itens: itensPedido.map((item) => ({
				id: uuidv4(),
				idpedidocompra: idPedido,
				idproduto: item.idproduto,
				descricao: item.descricao,
				quantidade: item.quantidade,
				precounitario: item.precounitario,
				total: item.total,
				idcotacaoitem: item.idcotacaoitem,
			})),
		});
		codigo += 1;
	}

	const criados = await criarPedidosCompraEmLote(payloads);

	await atualizarCotacaoCompra(id, {
		status: STATUS_COTACAO_COMPRA.ENCERRADA,
		currenttimemillis: Date.now(),
	});

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "gerar_pedidos_cotacao_compra",
		idusuario,
		recurso: "cotacao_compra",
		idrecurso: id,
		idempresa: cotacao.idempresa,
		criadoem: new Date().toISOString(),
		metadados: { pedidos: criados.length },
	});

	const data: PedidoCompraCompleto[] = [];
	for (const criado of criados) {
		const itensEnriquecidos = await listarItensPedidoCompraEnriquecidos(
			criado.cabecalho.id,
		);
		data.push({
			...criado.cabecalho,
			itens: itensEnriquecidos,
			cotacaotitulo: cotacao.titulo,
			cotacaocodigo: cotacao.codigo,
		});
	}

	return httpCriacao({ data });
}

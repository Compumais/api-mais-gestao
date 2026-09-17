import type { HttpResponse } from "@/model/http-model.js";
import type { PedidoCompraCompleto } from "@/model/pedido-compra-model.js";
import { STATUS_PEDIDO_COMPRA } from "@/model/pedido-compra-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarPedidoCompra,
	buscarPedidoCompraPorId,
	listarItensPedidoCompraEnriquecidos,
} from "@/repositories/pedido-compra-repositories.js";
import { criarCotacaoCompraService } from "@/service/cotacoes-compra/criar-cotacao-compra.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";
import { buscarPedidoCompraPorIdService } from "./pedidos-compra.js";

export async function converterPedidoCompraCotacaoService({
	id,
	idusuario,
	titulo,
	validade,
}: {
	id: string;
	idusuario: string;
	titulo?: string | null;
	validade?: string | null;
}): Promise<HttpResponse<PedidoCompraCompleto>> {
	const pedido = await buscarPedidoCompraPorId(id);
	if (!pedido) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		pedido.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (pedido.status === STATUS_PEDIDO_COMPRA.CANCELADO) {
		return httpBadRequest("Pedido cancelado não pode virar cotação");
	}

	if (pedido.idcotacao) {
		return httpBadRequest("Este pedido já está vinculado a uma cotação");
	}

	const itens = await listarItensPedidoCompraEnriquecidos(id);
	if (itens.length === 0) {
		return httpBadRequest("O pedido não possui itens para gerar a cotação");
	}

	const tituloCotacao =
		(titulo ?? "").trim() ||
		`Cotação do pedido #${pedido.codigo}`.slice(0, 120);

	const cotacao = await criarCotacaoCompraService({
		idusuario,
		idempresa: pedido.idempresa,
		titulo: tituloCotacao,
		observacao: pedido.observacao,
		validade: validade ?? null,
		itens: itens.map((item) => ({
			idproduto: item.idproduto,
			descricao: item.descricao ?? item.nomeproduto ?? item.descricaoproduto,
			quantidade: item.quantidade,
		})),
	});

	if (!cotacao.success || !cotacao.body) {
		return cotacao as HttpResponse<PedidoCompraCompleto>;
	}

	const atualizado = await atualizarPedidoCompra(id, {
		idcotacao: cotacao.body.id,
		currenttimemillis: Date.now(),
	});
	if (!atualizado) {
		return httpNaoEncontrado();
	}

	return buscarPedidoCompraPorIdService({ id, idusuario });
}

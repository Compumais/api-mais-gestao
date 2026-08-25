import type { HttpResponse } from "@/model/http-model.js";
import type { PedidoCompraCompleto } from "@/model/pedido-compra-model.js";
import { STATUS_PEDIDO_COMPRA } from "@/model/pedido-compra-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarPedidoCompra,
	buscarPedidoCompraPorId,
	listarItensPedidoCompraEnriquecidos,
	listarPedidosCompra,
} from "@/repositories/pedido-compra-repositories.js";
import { buscarCotacaoCompraPorId } from "@/repositories/cotacao-compra-repositories.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type ListarPedidosParametros = {
	idusuario: string;
	idempresa: string;
	status?: string | undefined;
	idcotacao?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarPedidosCompraService({
	idusuario,
	idempresa,
	status,
	idcotacao,
	page = 1,
	limit = 10,
}: ListarPedidosParametros) {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpOk({
			data: [],
			paginacao: { page, limit, total: 0, totalPages: 0 },
		});
	}

	const { pedidos, total } = await listarPedidosCompra({
		idempresa,
		status,
		idcotacao,
		page,
		limit,
	});

	return httpOk({
		data: pedidos,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
}

export async function buscarPedidoCompraPorIdService({
	id,
	idusuario,
}: {
	id: string;
	idusuario: string;
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

	const itens = await listarItensPedidoCompraEnriquecidos(id);
	let cotacaotitulo: string | null = null;
	let cotacaocodigo: number | null = null;
	if (pedido.idcotacao) {
		const cotacao = await buscarCotacaoCompraPorId(pedido.idcotacao);
		cotacaotitulo = cotacao?.titulo ?? null;
		cotacaocodigo = cotacao?.codigo ?? null;
	}

	return httpOk<PedidoCompraCompleto>({
		...pedido,
		itens,
		cotacaotitulo,
		cotacaocodigo,
	});
}

export async function cancelarPedidoCompraService({
	id,
	idusuario,
}: {
	id: string;
	idusuario: string;
}): Promise<HttpResponse<Awaited<ReturnType<typeof buscarPedidoCompraPorId>>>> {
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
		return httpBadRequest("Pedido já está cancelado");
	}

	const atualizado = await atualizarPedidoCompra(id, {
		status: STATUS_PEDIDO_COMPRA.CANCELADO,
		currenttimemillis: Date.now(),
	});
	if (!atualizado) {
		return httpNaoEncontrado();
	}

	return httpOk(atualizado);
}

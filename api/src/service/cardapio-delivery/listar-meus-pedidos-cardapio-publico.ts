import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCardapioDeliveryPorSlug,
	listarPedidosCardapioPorTelefone,
} from "@/repositories/cardapio-delivery-repositories.js";
import { httpBadRequest, httpNaoEncontrado, httpOk } from "@/util/http-util.js";
import { numberFromDecimal } from "@/util/totais-cardapio-delivery.js";

export type MeuPedidoCardapioItem = {
	idproduto: string;
	quantidade: number;
	nomeproduto: string;
	idprodutomeio: string | null;
	precototal: number;
};

export type MeuPedidoCardapio = {
	id: string;
	protocolo: string;
	status: string;
	modalidade: string;
	total: number;
	criadoem: string;
	itens: MeuPedidoCardapioItem[];
};

export async function listarMeusPedidosCardapioPublicoService(params: {
	slug: string;
	telefone: string;
}): Promise<HttpResponse<{ pedidos: MeuPedidoCardapio[] }>> {
	const cardapio = await buscarCardapioDeliveryPorSlug(params.slug);
	if (!cardapio || cardapio.ativo !== 1) {
		return httpNaoEncontrado("Cardápio indisponível");
	}

	const telefone = params.telefone.replace(/\D/g, "");
	if (telefone.length < 10) {
		return httpBadRequest("Informe um telefone com DDD");
	}

	const rows = await listarPedidosCardapioPorTelefone(
		cardapio.idempresa,
		telefone,
		5,
	);

	return httpOk({
		pedidos: rows.map((pedido) => ({
			id: pedido.id,
			protocolo: pedido.protocolo,
			status: pedido.status,
			modalidade: pedido.modalidade,
			total: numberFromDecimal(pedido.total),
			criadoem: pedido.criadoem,
			itens: (pedido.itens ?? []).map((item) => ({
				idproduto: item.idproduto,
				quantidade: Number(item.quantidade) || 0,
				nomeproduto: item.nomeproduto || "Item",
				idprodutomeio: item.idprodutomeio ?? null,
				precototal: Number(item.precototal) || 0,
			})),
		})),
	});
}

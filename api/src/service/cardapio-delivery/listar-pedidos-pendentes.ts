import type { PedidoCardapioDelivery } from "@/model/cardapio-delivery-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarPedidosCardapioPendentes } from "@/repositories/cardapio-delivery-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import { numberFromDecimal } from "@/util/totais-cardapio-delivery.js";

export type PedidoCardapioPendentePdv = {
	id: string;
	protocolo: string;
	modalidade: "delivery" | "retirada";
	nomecliente: string;
	telefone: string;
	documento: string | null;
	endereco: string | null;
	bairro: string | null;
	complemento: string | null;
	referencia: string | null;
	valorentrega: number;
	obs: string | null;
	nomemeiopagamento: string | null;
	itens: Array<{
		idproduto: string;
		quantidade: number;
		observacao: string | null;
		idprodutomeio: string | null;
		nomeproduto: string | null;
		precounitario: number | null;
	}>;
};

type ListarPedidosPendentesParametros = {
	idempresa: string;
	idusuario: string;
};

function mapear(pedido: PedidoCardapioDelivery): PedidoCardapioPendentePdv {
	return {
		id: pedido.id,
		protocolo: pedido.protocolo,
		modalidade: pedido.modalidade === "retirada" ? "retirada" : "delivery",
		nomecliente: pedido.nomecliente,
		telefone: pedido.telefone,
		documento: pedido.documento,
		endereco:
			[pedido.endereco, pedido.numero].filter(Boolean).join(", ") || null,
		bairro: pedido.bairro,
		complemento: pedido.complemento,
		referencia: pedido.referencia,
		valorentrega: numberFromDecimal(pedido.valorentrega),
		obs:
			[pedido.observacao, pedido.nomemeiopagamento]
				.filter(Boolean)
				.join(" | ") || null,
		nomemeiopagamento: pedido.nomemeiopagamento,
		itens: (pedido.itens ?? []).map((item) => ({
			idproduto: item.idproduto,
			quantidade: item.quantidade,
			observacao: item.observacao ?? null,
			idprodutomeio: item.idprodutomeio ?? null,
			nomeproduto: item.nomeproduto ?? null,
			precounitario: item.precounitario ?? null,
		})),
	};
}

export async function listarPedidosCardapioPendentesService({
	idempresa,
	idusuario,
}: ListarPedidosPendentesParametros): Promise<
	HttpResponse<{ data: PedidoCardapioPendentePdv[] }>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const pedidos = await listarPedidosCardapioPendentes(idempresa);
	return httpOk({ data: pedidos.map(mapear) });
}

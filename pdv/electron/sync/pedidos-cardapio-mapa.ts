import type { PedidoCardapioPendentePdv } from "../api/client";

export function mapearPedidoCardapioParaIngest(
	pedido: PedidoCardapioPendentePdv,
) {
	return {
		protocol: pedido.protocolo,
		modalidade: pedido.modalidade,
		nomecliente: pedido.nomecliente,
		telefone: pedido.telefone,
		endereco: pedido.endereco,
		bairro: pedido.bairro,
		complemento: pedido.complemento,
		referencia: pedido.referencia,
		documento: pedido.documento,
		valorentrega: pedido.valorentrega,
		obs: pedido.obs,
		itens: pedido.itens.map((item) => ({
			idproduto: item.idproduto,
			nomeproduto: item.nomeproduto,
			quantidade: item.quantidade,
			observacao: item.observacao,
			idprodutomeio: item.idprodutomeio,
			precounitario: item.precounitario,
		})),
	};
}

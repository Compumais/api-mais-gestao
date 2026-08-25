import type * as schema from "@/repositories/schema.js";

export type PedidoCompra = typeof schema.pedidocompra.$inferSelect;
export type NovoPedidoCompra = typeof schema.pedidocompra.$inferInsert;
export type PedidoCompraItem = typeof schema.pedidocompraitem.$inferSelect;
export type NovoPedidoCompraItem = typeof schema.pedidocompraitem.$inferInsert;

export const STATUS_PEDIDO_COMPRA = {
	ABERTO: "A",
	CANCELADO: "C",
} as const;

export type PedidoCompraItemEnriquecido = PedidoCompraItem & {
	codigoproduto: number | null;
	nomeproduto: string | null;
	descricaoproduto: string | null;
};

export type PedidoCompraCompleto = PedidoCompra & {
	itens: PedidoCompraItemEnriquecido[];
	cotacaotitulo: string | null;
	cotacaocodigo: number | null;
};

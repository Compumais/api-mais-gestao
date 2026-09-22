import type {
	cardapiodelivery,
	pedidocardapiodelivery,
} from "@/repositories/schema.js";

export type {
	BairroEntrega,
	CampoFinalizacao,
	CampoFinalizacaoCondicao,
	CampoFinalizacaoTipo,
	HorarioCardapio,
	HorarioDia,
	HorarioDiaChave,
	ItemPedidoCardapio,
	RespostaCampoCardapio,
	StatusPedidoCardapio,
} from "./cardapio-delivery-tipos.js";

export type CardapioDelivery = typeof cardapiodelivery.$inferSelect;
export type NovoCardapioDelivery = typeof cardapiodelivery.$inferInsert;
export type PedidoCardapioDelivery = typeof pedidocardapiodelivery.$inferSelect;
export type NovoPedidoCardapioDelivery =
	typeof pedidocardapiodelivery.$inferInsert;

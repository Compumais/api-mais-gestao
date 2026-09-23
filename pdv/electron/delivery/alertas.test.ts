import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tituloAlertaPedidoDelivery } from "./alertas";

describe("tituloAlertaPedidoDelivery", () => {
	it("inclui senha e tipo", () => {
		assert.equal(
			tituloAlertaPedidoDelivery({
				id: "1",
				modalidade: "delivery",
				senha: "003",
				nomecliente: "Ana",
			}),
			"Novo pedido Delivery #003",
		);
	});

	it("trata retirada sem senha", () => {
		assert.equal(
			tituloAlertaPedidoDelivery({
				id: "1",
				modalidade: "retirada",
				senha: null,
				nomecliente: null,
			}),
			"Novo pedido Retirada",
		);
	});
});

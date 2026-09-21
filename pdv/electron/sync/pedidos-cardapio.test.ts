import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { montarItemPizzaMeioAMeio } from "../util/pizza-meio-a-meio";
import { mapearPedidoCardapioParaIngest } from "./pedidos-cardapio-mapa";

describe("ingest de pizza no cardápio", () => {
	it("repassa idprodutomeio com o preço da maior metade", () => {
		const item = montarItemPizzaMeioAMeio(
			{ id: "a", descricao: "Calabresa", preco: 40, espizza: 1 },
			{ id: "b", descricao: "Frango", preco: 50, espizza: 1 },
		);
		assert.equal(item.idproduto, "b");
		assert.equal(item.idprodutomeio, "a");
		assert.equal(item.precounitario, 50);
	});

	it("mantém idprodutomeio no payload enviado ao ingest local", () => {
		const payload = mapearPedidoCardapioParaIngest({
			id: "p1",
			protocolo: "ABC123",
			modalidade: "delivery",
			nomecliente: "Ana",
			telefone: "11999999999",
			documento: null,
			endereco: "Rua A, 10",
			bairro: "Centro",
			complemento: null,
			referencia: null,
			valorentrega: 5,
			obs: "PIX",
			itens: [
				{
					idproduto: "pizza-a",
					quantidade: 1,
					observacao: "sem cebola",
					idprodutomeio: "pizza-b",
					nomeproduto: "Calabresa",
					precounitario: 50,
				},
			],
		});
		assert.equal(payload.protocol, "ABC123");
		assert.equal(payload.itens[0]?.idprodutomeio, "pizza-b");
		assert.equal(payload.itens[0]?.precounitario, 50);
	});
});

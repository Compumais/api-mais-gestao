import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	formatarMoedaWhatsapp,
	montarCopiaPedidoWhatsapp,
	montarMensagemStatusWhatsapp,
	montarMensagemTemplate,
} from "./templates";

describe("formatarMoedaWhatsapp", () => {
	it("formata real brasileiro", () => {
		assert.equal(formatarMoedaWhatsapp(12.5), "R$ 12,50");
		assert.equal(formatarMoedaWhatsapp(1234), "R$ 1.234,00");
	});
});

describe("montarCopiaPedidoWhatsapp", () => {
	it("monta cópia de delivery com itens, taxa e endereço", () => {
		const texto = montarCopiaPedidoWhatsapp({
			modalidade: "delivery",
			senha: "003",
			itens: [
				{
					descricao: "Pizza Calabresa",
					quantidade: 2,
					precototal: 80,
					observacao: "sem cebola",
				},
				{
					descricao: "Coca 2L",
					quantidade: 1,
					precototal: 12,
				},
			],
			valorentrega: 8,
			valortotal: 100,
			endereco: "Rua das Flores, 10",
			bairro: "Centro",
			complemento: "apto 2",
			referencia: "próximo ao mercado",
			obs: "entregar na portaria",
		});
		assert.match(texto, /\*Pedido #003 — Delivery\*/);
		assert.match(texto, /• 2x Pizza Calabresa — R\$ 80,00/);
		assert.match(texto, /_sem cebola_/);
		assert.match(texto, /Taxa de entrega: R\$ 8,00/);
		assert.match(texto, /\*Total: R\$ 100,00\*/);
		assert.match(texto, /📍 Rua das Flores, 10 — Centro — apto 2/);
		assert.match(texto, /Ref\.: próximo ao mercado/);
		assert.match(texto, /Obs\.: entregar na portaria/);
	});

	it("omite endereço e taxa na retirada", () => {
		const texto = montarCopiaPedidoWhatsapp({
			modalidade: "retirada",
			senha: "012",
			itens: [{ descricao: "X-Burger", quantidade: 1, precototal: 22 }],
			valorentrega: 8,
			valortotal: 22,
			endereco: "Rua X",
		});
		assert.match(texto, /Retirada/);
		assert.doesNotMatch(texto, /📍/);
		assert.doesNotMatch(texto, /Taxa de entrega/);
	});
});

describe("montarMensagemStatusWhatsapp", () => {
	it("substitui {pedido} no template de recebido", () => {
		const corpo = montarMensagemStatusWhatsapp({
			template: "Oi {nome}!\n\n{pedido}\n\nObrigado.",
			nome: "Ana",
			protocolo: "003",
			copiaPedido: "*Pedido #003 — Delivery*\n• 1x Suco — R$ 8,00",
		});
		assert.match(corpo, /Oi Ana!/);
		assert.match(corpo, /• 1x Suco/);
		assert.doesNotMatch(corpo, /\{pedido\}/);
	});

	it("anexa a cópia se o template antigo não tem {pedido}", () => {
		const corpo = montarMensagemStatusWhatsapp({
			template: "Olá {nome}, recebemos seu pedido #{protocolo}.",
			nome: "Ana",
			protocolo: "003",
			copiaPedido: "*Pedido #003 — Delivery*",
			incluirCopiaSeAusente: true,
		});
		assert.match(corpo, /recebemos seu pedido #003/);
		assert.match(corpo, /\*Pedido #003 — Delivery\*/);
	});
});

describe("montarMensagemTemplate", () => {
	it("usa cliente quando o nome vem vazio", () => {
		assert.equal(
			montarMensagemTemplate("Oi {nome}", { nome: "  " }),
			"Oi cliente",
		);
	});
});

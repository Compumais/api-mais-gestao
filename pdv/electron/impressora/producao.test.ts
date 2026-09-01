import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	agruparLinhasPedidoFila,
	montarCuponsProducao,
	normalizarModoImpressaoProducao,
} from "./producao";

describe("impressão de produção", () => {
	it("normaliza modo desconhecido para itens", () => {
		assert.equal(normalizarModoImpressaoProducao(undefined), "itens");
		assert.equal(normalizarModoImpressaoProducao("itens"), "itens");
		assert.equal(normalizarModoImpressaoProducao("pedido"), "pedido");
	});

	it("agrupa linhas da fila pelo pedido", () => {
		const grupos = agruparLinhasPedidoFila([
			{ client_order_id: "a", criadoem: "2026-09-01T10:00:00.000Z" },
			{ client_order_id: "b", criadoem: "2026-09-01T11:00:00.000Z" },
			{ client_order_id: "a", criadoem: "2026-09-01T10:01:00.000Z" },
		]);
		assert.equal(grupos.length, 2);
		assert.equal(grupos[0]?.[0]?.client_order_id, "b");
		assert.equal(grupos[1]?.length, 2);
	});

	it("modo itens separa cupons por grupo gourmet", async () => {
		const cupons = await montarCuponsProducao({
			modo: "itens",
			itens: [
				{ idproduto: "pizza", descricao: "Calabresa", quantidade: 1 },
				{ idproduto: "refri", descricao: "Coca", quantidade: 2 },
				{ idproduto: "sem-grupo", descricao: "Talher", quantidade: 1 },
			],
			destinoPedido: null,
			resolverProduto: async (id) => {
				if (id === "pizza") {
					return { idgrupogourmet: "cozinha", descricao: "Calabresa" };
				}
				if (id === "refri") {
					return { idgrupogourmet: "bar", descricao: "Coca" };
				}
				return { idgrupogourmet: null, descricao: "Talher" };
			},
			resolverDestinoGrupo: async (idGrupo) => {
				if (idGrupo === "cozinha") {
					return { tipo: "sistema", nome: "Cozinha" };
				}
				if (idGrupo === "bar") {
					return { tipo: "rede", host: "10.0.0.8", porta: 9100 };
				}
				return null;
			},
		});
		assert.equal(cupons.length, 2);
		assert.equal(cupons[0]?.itens.length, 1);
		assert.equal(cupons[1]?.itens.length, 1);
		assert.equal(
			cupons.some((c) => c.itens[0]?.descricao === "Talher"),
			false,
		);
	});

	it("modo pedido emite um cupom com todos os produtos", async () => {
		const cupons = await montarCuponsProducao({
			modo: "pedido",
			itens: [
				{ idproduto: "pizza", descricao: "Calabresa", quantidade: 1 },
				{ idproduto: "refri", descricao: "", quantidade: 2 },
				{ idproduto: "sem-grupo", descricao: "Talher", quantidade: 1 },
			],
			destinoPedido: { tipo: "sistema", nome: "Unica" },
			resolverProduto: async (id) => {
				if (id === "refri") {
					return { idgrupogourmet: "bar", descricao: "Coca" };
				}
				return {
					idgrupogourmet: id === "pizza" ? "cozinha" : null,
					descricao: id,
				};
			},
			resolverDestinoGrupo: async () => ({ tipo: "sistema", nome: "Ignorada" }),
		});
		assert.equal(cupons.length, 1);
		assert.equal(cupons[0]?.destino.nome, "Unica");
		assert.deepEqual(
			cupons[0]?.itens.map((i) => i.descricao),
			["Calabresa", "Coca", "Talher"],
		);
	});

	it("modo pedido sem impressora não emite cupom", async () => {
		const cupons = await montarCuponsProducao({
			modo: "pedido",
			itens: [{ idproduto: "1", descricao: "X", quantidade: 1 }],
			destinoPedido: null,
			resolverProduto: async () => ({ idgrupogourmet: "g", descricao: "X" }),
			resolverDestinoGrupo: async () => ({ tipo: "sistema", nome: "A" }),
		});
		assert.deepEqual(cupons, []);
	});
});

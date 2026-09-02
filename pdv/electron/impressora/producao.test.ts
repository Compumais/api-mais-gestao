import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	agruparLinhasPedidoFila,
	montarCuponsProducao,
	nomeGrupoProducao,
	normalizarModoImpressaoProducao,
	ordenarItensPorGrupo,
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

	it("preferência de nome: gourmet sobre grupo", () => {
		assert.equal(
			nomeGrupoProducao({
				nomeGrupogourmet: "Cozinha",
				nomeGrupo: "Pizzas",
				idgrupogourmet: "g1",
				idgrupo: "p1",
			}),
			"Cozinha",
		);
		assert.equal(
			nomeGrupoProducao({
				nomeGrupogourmet: null,
				nomeGrupo: "Bebidas",
				idgrupogourmet: null,
				idgrupo: "b1",
			}),
			"Bebidas",
		);
		assert.equal(
			nomeGrupoProducao({
				nomeGrupogourmet: null,
				nomeGrupo: null,
				idgrupogourmet: null,
				idgrupo: null,
			}),
			null,
		);
	});

	it("ordena itens por grupo com OUTROS no fim", () => {
		const ordenados = ordenarItensPorGrupo([
			{ idproduto: "1", descricao: "Talher", quantidade: 1, nomeGrupo: null },
			{
				idproduto: "2",
				descricao: "Coca",
				quantidade: 1,
				nomeGrupo: "Bar",
			},
			{
				idproduto: "3",
				descricao: "Pizza",
				quantidade: 1,
				nomeGrupo: "Cozinha",
			},
			{
				idproduto: "4",
				descricao: "Suco",
				quantidade: 1,
				nomeGrupo: "Bar",
			},
		]);
		assert.deepEqual(
			ordenados.map((i) => i.descricao),
			["Coca", "Suco", "Pizza", "Talher"],
		);
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
					return {
						idgrupogourmet: "cozinha",
						idgrupo: null,
						descricao: "Calabresa",
						nomeGrupogourmet: "Cozinha",
						nomeGrupo: null,
					};
				}
				if (id === "refri") {
					return {
						idgrupogourmet: "bar",
						idgrupo: null,
						descricao: "Coca",
						nomeGrupogourmet: "Bar",
						nomeGrupo: null,
					};
				}
				return {
					idgrupogourmet: null,
					idgrupo: null,
					descricao: "Talher",
					nomeGrupogourmet: null,
					nomeGrupo: null,
				};
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

	it("modo pedido emite um cupom agrupado por grupo gourmet/grupo", async () => {
		const cupons = await montarCuponsProducao({
			modo: "pedido",
			itens: [
				{ idproduto: "pizza", descricao: "Calabresa", quantidade: 1 },
				{ idproduto: "refri", descricao: "", quantidade: 2 },
				{ idproduto: "sem-grupo", descricao: "Talher", quantidade: 1 },
				{ idproduto: "agua", descricao: "Agua", quantidade: 1 },
			],
			destinoPedido: { tipo: "sistema", nome: "Unica" },
			resolverProduto: async (id) => {
				if (id === "refri" || id === "agua") {
					return {
						idgrupogourmet: "bar",
						idgrupo: "bebidas",
						descricao: id === "refri" ? "Coca" : "Agua",
						nomeGrupogourmet: "Bar",
						nomeGrupo: "Bebidas",
					};
				}
				if (id === "pizza") {
					return {
						idgrupogourmet: "cozinha",
						idgrupo: "pizzas",
						descricao: "Calabresa",
						nomeGrupogourmet: "Cozinha",
						nomeGrupo: "Pizzas",
					};
				}
				return {
					idgrupogourmet: null,
					idgrupo: null,
					descricao: id,
					nomeGrupogourmet: null,
					nomeGrupo: null,
				};
			},
			resolverDestinoGrupo: async () => ({ tipo: "sistema", nome: "Ignorada" }),
		});
		assert.equal(cupons.length, 1);
		assert.equal(cupons[0]?.destino.nome, "Unica");
		assert.deepEqual(
			cupons[0]?.itens.map((i) => ({
				descricao: i.descricao,
				nomeGrupo: i.nomeGrupo,
			})),
			[
				{ descricao: "Coca", nomeGrupo: "Bar" },
				{ descricao: "Agua", nomeGrupo: "Bar" },
				{ descricao: "Calabresa", nomeGrupo: "Cozinha" },
				{ descricao: "Talher", nomeGrupo: null },
			],
		);
	});

	it("modo pedido sem impressora não emite cupom", async () => {
		const cupons = await montarCuponsProducao({
			modo: "pedido",
			itens: [{ idproduto: "1", descricao: "X", quantidade: 1 }],
			destinoPedido: null,
			resolverProduto: async () => ({
				idgrupogourmet: "g",
				idgrupo: null,
				descricao: "X",
				nomeGrupogourmet: "G",
				nomeGrupo: null,
			}),
			resolverDestinoGrupo: async () => ({ tipo: "sistema", nome: "A" }),
		});
		assert.deepEqual(cupons, []);
	});
});

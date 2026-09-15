import { describe, expect, it } from "vitest";
import {
	documentoHistoricoVendaPdv,
	meiosPagamentoHistoricoVendaPdv,
	nomeOperadorHistoricoVendaPdv,
	rotuloMeioPagamentoPdv,
} from "./historico-venda-pdv.js";

describe("historico-venda-pdv", () => {
	it("rotula meios conhecidos", () => {
		expect(rotuloMeioPagamentoPdv("DINHEIRO")).toBe("Dinheiro");
		expect(rotuloMeioPagamentoPdv("pix")).toBe("PIX");
		expect(rotuloMeioPagamentoPdv("CARTAO_CREDITO")).toBe("Cartão crédito");
	});

	it("prioriza lançamentos da tabela de pagamentos", () => {
		expect(
			meiosPagamentoHistoricoVendaPdv({
				pagamentos: [
					{ meio: "DINHEIRO", valor: "10" },
					{ meio: "PIX", valor: "20" },
					{ meio: "CARTAO", valor: "0", status: "ok" },
				],
				valordinheiro: "99",
			}),
		).toEqual(["Dinheiro", "PIX"]);
	});

	it("usa totais da venda quando não há lançamentos", () => {
		expect(
			meiosPagamentoHistoricoVendaPdv({
				pagamentos: [],
				valordinheiro: "10.00",
				valorpix: "0",
				valorcartaodebito: "5",
			}),
		).toEqual(["Dinheiro", "Cartão débito"]);
	});

	it("classifica fiscal e gerencial", () => {
		expect(documentoHistoricoVendaPdv({ idnotafiscalnfce: "nf-1" })).toBe(
			"fiscal",
		);
		expect(documentoHistoricoVendaPdv({ deveemitirnfce: true })).toBe("fiscal");
		expect(documentoHistoricoVendaPdv({})).toBe("gerencial");
	});

	it("usa nome do cadastro e nunca devolve o id opaco", () => {
		expect(
			nomeOperadorHistoricoVendaPdv({
				nome: "Maria Silva",
				email: "maria@empresa.com",
			}),
		).toBe("Maria Silva");
		expect(
			nomeOperadorHistoricoVendaPdv({
				nome: "uxgD4bawBWokD04hn0wpElyRtkz6nuEn",
				email: "maria@empresa.com",
			}),
		).toBe("maria@empresa.com");
		expect(
			nomeOperadorHistoricoVendaPdv({
				nome: "uxgD4bawBWokD04hn0wpElyRtkz6nuEn",
			}),
		).toBeNull();
	});
});

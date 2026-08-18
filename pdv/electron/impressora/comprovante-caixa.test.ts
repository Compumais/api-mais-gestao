import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { montarTextoComprovanteFechamentoCaixa } from "./comprovante-caixa";

describe("montarTextoComprovanteFechamentoCaixa", () => {
	it("lista meios, gaveta e a diferença", () => {
		const texto = montarTextoComprovanteFechamentoCaixa({
			nomeempresa: "Loja Teste",
			username: "caixa1",
			numeropdv: 2,
			abertoem: "2026-08-18T08:00:00.000Z",
			fechadoem: "2026-08-18T18:00:00.000Z",
			resumo: {
				qtdVendas: 3,
				pagamentos: {
					dinheiro: 40,
					pix: 30,
					cartao: 20,
					prepago: 0,
					total: 90,
				},
				totalVendas: 90,
				suprimento: 100,
				saldoapurado: 90,
				saldoCaixaFisico: 140,
			},
			conferencia: {
				saldoinformado: 135,
				diferenca: -5,
				sobra: 0,
				falta: 5,
			},
		});
		assert.match(texto, /FECHAMENTO DE CAIXA/);
		assert.match(texto, /PDV: 2/);
		assert.match(texto, /PIX/);
		assert.match(texto, /Cartao/);
		assert.match(texto, /Falta/);
	});
});

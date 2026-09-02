import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	montarTextoComprovanteFechamentoCaixa,
	montarTextoItensVendidosTurno,
} from "./comprovante-caixa";

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

describe("montarTextoItensVendidosTurno", () => {
	it("lista itens agrupados no formato quantidade x descricao", () => {
		const texto = montarTextoItensVendidosTurno({
			nomeempresa: "Lanchonete",
			username: "caixa1",
			numeropdv: 1,
			abertoem: "2026-08-18T08:00:00.000Z",
			emitidoem: "2026-08-18T18:00:00.000Z",
			itens: [
				{ descricao: "Pastel de Frango", quantidade: 3 },
				{ descricao: "Coca Cola", quantidade: 2 },
			],
		});
		assert.match(texto, /ITENS VENDIDOS NO TURNO/);
		assert.match(texto, /3X PASTEL DE FRANGO/);
		assert.match(texto, /2X COCA COLA/);
	});
});

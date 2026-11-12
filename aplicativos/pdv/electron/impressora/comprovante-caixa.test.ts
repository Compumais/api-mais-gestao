import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	montarTextoComprovanteFechamentoCaixa,
	montarTextoComprovanteSangriaCaixa,
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
					cartaocredito: 12,
					cartaodebito: 8,
					prepago: 0,
					total: 90,
				},
				totalVendas: 90,
				suprimento: 100,
				sangria: 0,
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
		assert.match(texto, /Cartao debito/);
		assert.match(texto, /Cartao credito/);
		assert.match(texto, /Falta/);
	});

	it("inclui linha de sangria quando houver retiradas no turno", () => {
		const texto = montarTextoComprovanteFechamentoCaixa({
			nomeempresa: "Loja Teste",
			username: "caixa1",
			numeropdv: 1,
			abertoem: "2026-08-18T08:00:00.000Z",
			fechadoem: "2026-08-18T18:00:00.000Z",
			resumo: {
				qtdVendas: 1,
				pagamentos: {
					dinheiro: 100,
					pix: 0,
					cartao: 0,
					cartaocredito: 0,
					cartaodebito: 0,
					prepago: 0,
					total: 100,
				},
				totalVendas: 100,
				suprimento: 50,
				sangria: 50,
				saldoapurado: 100,
				saldoCaixaFisico: 100,
			},
			conferencia: {
				saldoinformado: 100,
				diferenca: 0,
				sobra: 0,
				falta: 0,
			},
		});
		assert.match(texto, /Sangrias: -/);
	});
});

describe("montarTextoComprovanteSangriaCaixa", () => {
	it("formata comprovante com valor, motivo, saldo e assinaturas", () => {
		const texto = montarTextoComprovanteSangriaCaixa({
			nomeempresa: "Supermercado Exemplo",
			username: "operador_joao",
			numeropdv: 1,
			datahora: "2026-08-18T14:30:00.000Z",
			valor: 100,
			motivo: "Retirada do suprimento inicial",
			saldoRestanteGaveta: 50,
		});
		assert.match(texto, /SANGRIA \/ RETIRADA DE CAIXA/);
		assert.match(texto, /Supermercado Exemplo/);
		assert.match(texto, /PDV: 1/);
		assert.match(texto, /Operador: operador_joao/);
		assert.match(texto, /VALOR RETIRADO: R\$\s*100,00/);
		assert.match(texto, /Motivo: Retirada do suprimento inicial/);
		assert.match(texto, /Saldo restante gaveta: R\$\s*50,00/);
		assert.match(texto, /Assinatura Operador:/);
		assert.match(texto, /Assinatura Supervisor:/);
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

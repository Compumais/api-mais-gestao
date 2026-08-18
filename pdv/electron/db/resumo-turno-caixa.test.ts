import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calcularConferenciaCaixa,
	montarResumoTurnoCaixa,
	pagamentosVendaTurno,
} from "./resumo-turno-caixa";

describe("pagamentosVendaTurno", () => {
	it("desconta o troco do dinheiro líquido", () => {
		assert.deepEqual(
			pagamentosVendaTurno({
				valortotal: 40,
				valordinheiro: 50,
				valorpix: 0,
				valorcartao: 0,
				valortroco: 10,
			}),
			{
				dinheiro: 40,
				cartao: 0,
				pix: 0,
				prepago: 0,
				total: 40,
			},
		);
	});

	it("usa lançamentos PIX+cartão quando o meio da venda é misto", () => {
		const parcela = pagamentosVendaTurno({
			valortotal: 80,
			valordinheiro: 0,
			valorpix: 0,
			valorcartao: 0,
			valortroco: 0,
			lanc_pix: 50,
			lanc_cartao: 30,
		});
		assert.equal(parcela.pix, 50);
		assert.equal(parcela.cartao, 30);
		assert.equal(parcela.dinheiro, 0);
		assert.equal(parcela.total, 80);
	});
});

describe("montarResumoTurnoCaixa", () => {
	it("soma meios de pagamento e o saldo físico da gaveta", () => {
		const resumo = montarResumoTurnoCaixa({
			valorabertura: 100,
			vendas: [
				{
					valortotal: 40,
					valordinheiro: 50,
					valorpix: 0,
					valorcartao: 0,
					valortroco: 10,
				},
				{
					valortotal: 30,
					valordinheiro: 0,
					valorpix: 30,
					valorcartao: 0,
					valortroco: 0,
				},
				{
					valortotal: 20,
					valordinheiro: 0,
					valorpix: 0,
					valorcartao: 20,
					valortroco: 0,
				},
			],
		});

		assert.equal(resumo.qtdVendas, 3);
		assert.equal(resumo.pagamentos.dinheiro, 40);
		assert.equal(resumo.pagamentos.pix, 30);
		assert.equal(resumo.pagamentos.cartao, 20);
		assert.equal(resumo.saldoapurado, 90);
		assert.equal(resumo.saldoCaixaFisico, 140);
		assert.equal(resumo.suprimento, 100);
	});

	it("sem vendas fica só com o suprimento na gaveta", () => {
		const resumo = montarResumoTurnoCaixa({
			valorabertura: 50.5,
			vendas: [],
		});
		assert.equal(resumo.qtdVendas, 0);
		assert.equal(resumo.saldoapurado, 0);
		assert.equal(resumo.saldoCaixaFisico, 50.5);
	});
});

describe("calcularConferenciaCaixa", () => {
	it("calcula falta e sobra da conferência física", () => {
		assert.deepEqual(calcularConferenciaCaixa(140, 140), {
			saldoinformado: 140,
			diferenca: 0,
			sobra: 0,
			falta: 0,
		});
		assert.deepEqual(calcularConferenciaCaixa(145.5, 140), {
			saldoinformado: 145.5,
			diferenca: 5.5,
			sobra: 5.5,
			falta: 0,
		});
		assert.deepEqual(calcularConferenciaCaixa(130, 140), {
			saldoinformado: 130,
			diferenca: -10,
			sobra: 0,
			falta: 10,
		});
	});
});

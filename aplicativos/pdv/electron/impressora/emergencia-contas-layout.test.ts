import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	montarTextoEmergenciaContas,
	selecionarContasEmergencia,
} from "./emergencia-contas-layout";

function plano(texto: string): string {
	return texto.replace(/[\u00a0\u202f]/g, " ");
}

describe("emergência contas em aberto", () => {
	it("ordena pelo número e lista itens, total da conta e total geral", () => {
		const agora = new Date("2026-10-02T15:00:00.000Z");
		const texto = plano(
			montarTextoEmergenciaContas({
				rotulo: "Comanda",
				agora,
				contas: [
					{
						numero: 12,
						nomecliente: "Ana",
						itens: [
							{
								descricao: "Pastel de carne",
								quantidade: 2,
								precounitario: 8,
								precototal: 16,
							},
						],
						totalAberto: 16,
					},
					{
						numero: 2,
						nomecliente: null,
						itens: [
							{
								descricao: "Refrigerante",
								quantidade: 1.5,
								precounitario: 6,
								precototal: 9,
							},
						],
						totalAberto: 9,
					},
					{
						numero: 10,
						nomecliente: "Bruno",
						itens: [],
						totalAberto: 0,
					},
				],
			}),
		);

		const i2 = texto.indexOf("Comanda: 2");
		const i10 = texto.indexOf("Comanda: 10");
		const i12 = texto.indexOf("Comanda: 12");
		assert.ok(i2 >= 0 && i10 > i2 && i12 > i10);
		assert.match(texto, /EMERGENCIA - CONTAS ABERTAS/);
		assert.match(texto, /NAO E DOCUMENTO FISCAL/);
		assert.match(
			texto,
			new RegExp(
				plano(agora.toLocaleString("pt-BR")).replace(
					/[.*+?^${}()|[\]\\]/g,
					"\\$&",
				),
			),
		);
		assert.match(texto, /Cliente: Ana/);
		assert.match(texto, /Cliente: Bruno/);
		assert.match(texto, /Pastel de carne/);
		assert.match(texto, /2 x R\$ 8,00 = R\$ 16,00/);
		assert.match(texto, /1,500 x R\$ 6,00 = R\$ 9,00/);
		assert.match(texto, /Sem itens em aberto/);
		assert.match(texto, /EM ABERTO: R\$ 16,00/);
		assert.match(texto, /EM ABERTO: R\$ 9,00/);
		assert.match(texto, /EM ABERTO: R\$ 0,00/);
		assert.match(texto, /TOTAL GERAL: R\$ 25,00/);
		assert.match(texto, /Nao fecha contas nem o caixa/);
	});

	it("fica só com salão aberto, sem item pago, em ordem crescente", () => {
		const contas = selecionarContasEmergencia([
			{
				numero: 8,
				status: "aberta",
				modalidade: "delivery",
				nomecliente: "Entrega",
				valorrestante: 40,
				itens: [
					{
						descricao: "Pizza delivery",
						quantidade: 1,
						precounitario: 40,
						precototal: 40,
						pago: 0,
					},
				],
			},
			{
				numero: 4,
				status: "aberta",
				modalidade: "retirada",
				nomecliente: "Balcão",
				valorrestante: 12,
				itens: [
					{
						descricao: "Suco",
						quantidade: 1,
						precounitario: 12,
						precototal: 12,
						pago: 0,
					},
				],
			},
			{
				numero: 15,
				status: "fechada",
				modalidade: "mesa",
				nomecliente: "Já foi",
				valorrestante: 0,
				itens: [],
			},
			{
				numero: 3,
				status: "aberta",
				modalidade: "mesa",
				nomecliente: "Carla",
				valorrestante: 10.5,
				itens: [
					{
						descricao: "Item pago",
						quantidade: 1,
						precounitario: 5,
						precototal: 5,
						pago: 1,
					},
					{
						descricao: "Porção ainda aberta",
						quantidade: 1,
						precounitario: 10.5,
						precototal: 10.5,
						pago: 0,
					},
				],
			},
			{
				numero: 1,
				status: "aberta",
				modalidade: "mesa",
				nomecliente: null,
				valorrestante: 7,
				itens: [
					{
						descricao: "Água",
						quantidade: 1,
						precounitario: 7,
						precototal: 7,
						pago: 0,
					},
				],
			},
		]);

		assert.deepEqual(
			contas.map((conta) => conta.numero),
			[1, 3],
		);
		assert.deepEqual(
			contas[1]?.itens.map((item) => item.descricao),
			["Porção ainda aberta"],
		);
		assert.equal(contas[1]?.totalAberto, 10.5);
		const texto = plano(
			montarTextoEmergenciaContas({
				rotulo: "Mesa",
				contas,
				agora: new Date("2026-10-02T15:00:00.000Z"),
			}),
		);
		assert.doesNotMatch(texto, /Pizza delivery|Suco|Item pago|Já foi/);
		assert.match(texto, /Mesa: 1/);
		assert.match(texto, /Porção ainda aberta/);
		assert.match(texto, /TOTAL GERAL: R\$ 17,50/);
	});
});

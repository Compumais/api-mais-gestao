import { describe, expect, it } from "vitest";
import { avaliarHorarioCardapio } from "./avaliar-horario-cardapio.js";
import {
	campoFinalizacaoVisivel,
	montarPixCopiaCola,
	precoPizzaMeioAMeio,
	resolverTaxaEntrega,
} from "./totais-cardapio-delivery.js";

describe("avaliarHorarioCardapio", () => {
	it("permite pedidos quando o horário está desligado", () => {
		const resultado = avaliarHorarioCardapio({
			ativo: 0,
			modo: "simples",
			timezone: "America/Sao_Paulo",
			inicio: "09:00",
			fim: "10:00",
			semanal: {},
			datasfechadas: [],
			mensagem: "Fechado",
		});
		expect(resultado.aberto).toBe(true);
	});

	it("fecha em data bloqueada", () => {
		const agora = new Date("2026-12-25T15:00:00-03:00");
		const resultado = avaliarHorarioCardapio(
			{
				ativo: 1,
				modo: "simples",
				timezone: "America/Sao_Paulo",
				inicio: "00:00",
				fim: "23:59",
				semanal: {},
				datasfechadas: ["2026-12-25"],
				mensagem: "Natal",
			},
			agora,
		);
		expect(resultado.aberto).toBe(false);
		expect(resultado.mensagem).toBe("Natal");
	});
});

describe("totais do cardápio", () => {
	it("cobra a maior metade na pizza meio a meio", () => {
		expect(precoPizzaMeioAMeio(40, 55)).toBe(55);
		expect(precoPizzaMeioAMeio(55, 40)).toBe(55);
	});

	it("zera taxa na retirada e usa bairro no delivery", () => {
		expect(
			resolverTaxaEntrega({
				modalidade: "retirada",
				bairro: "Centro",
				taxaPadrao: 8,
				bairros: [{ nome: "Centro", taxa: 5 }],
			}),
		).toBe(0);
		expect(
			resolverTaxaEntrega({
				modalidade: "delivery",
				bairro: "Centro",
				taxaPadrao: 8,
				bairros: [{ nome: "Centro", taxa: 5 }],
			}),
		).toBe(5);
		expect(
			resolverTaxaEntrega({
				modalidade: "delivery",
				bairro: "Outro",
				taxaPadrao: 8,
				bairros: [{ nome: "Centro", taxa: 5 }],
			}),
		).toBe(8);
	});

	it("esconde campo condicional", () => {
		expect(
			campoFinalizacaoVisivel(
				{ campoid: "modalidade", valor: "delivery" },
				{ modalidade: "retirada" },
			),
		).toBe(false);
		expect(
			campoFinalizacaoVisivel(
				{ campoid: "modalidade", valor: "delivery" },
				{ modalidade: "delivery" },
			),
		).toBe(true);
	});
});

describe("PIX copia e cola", () => {
	it("gera payload EMV com CRC", () => {
		const payload = montarPixCopiaCola({
			chave: "chave@pix",
			nome: "Ana",
			cidade: "BRASIL",
			valor: 55,
			txid: "ABC123",
		});
		expect(payload.startsWith("000201")).toBe(true);
		expect(payload.includes("br.gov.bcb.pix")).toBe(true);
		expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
	});
});

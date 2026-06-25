import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsearOfx } from "./parse-ofx.js";

const diretorioAtual = dirname(fileURLToPath(import.meta.url));
const fixtureOfx = readFileSync(
	join(diretorioAtual, "../../test/fixtures/extrato.ofx"),
	"utf-8",
);

describe("parsearOfx", () => {
	it("extrai transações de crédito e débito", () => {
		const transacoes = parsearOfx(fixtureOfx);

		expect(transacoes).toHaveLength(2);
		expect(transacoes[0]).toMatchObject({
			data: "2024-06-15",
			valor: "1500.00",
			tipo: "C",
			historico: "PIX RECEBIDO",
			documento: "20240615001",
		});
		expect(transacoes[1]).toMatchObject({
			data: "2024-06-16",
			valor: "250.50",
			tipo: "D",
			historico: "PAGAMENTO FORNECEDOR",
			documento: "20240616001",
		});
	});

	it("lança erro quando não há transações", () => {
		expect(() => parsearOfx("OFXHEADER:100\n<OFX></OFX>")).toThrow(
			"Nenhuma transação encontrada no arquivo OFX",
		);
	});
});

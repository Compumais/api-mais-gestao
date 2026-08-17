import { describe, expect, it } from "vitest";
import {
	campoPagamentoVazio,
	totaisDeLancamentosPdv,
} from "./lancamento-pagamento-pdv.js";

describe("totaisDeLancamentosPdv", () => {
	it("agrega dois cartões sem perder o segundo valor", () => {
		const totais = totaisDeLancamentosPdv([
			{ meio: "CARTAO", valor: 60, nsu: "111", autorizacao: "A1" },
			{ meio: "CARTAO", valor: 40, nsu: "222", autorizacao: "A2" },
		]);

		expect(totais.valorcartaocredito).toBe("100.00");
		expect(totais.valorpix).toBe("0.00");
		expect(totais.valordinheiro).toBe("0.00");
	});

	it("ignora lançamento cancelado", () => {
		const totais = totaisDeLancamentosPdv([
			{ meio: "PIX", valor: 30, status: "ok" },
			{ meio: "PIX", valor: 20, status: "cancelado" },
		]);

		expect(totais.valorpix).toBe("30.00");
	});
});

describe("campoPagamentoVazio", () => {
	it("considera vazio nulo, string vazia e zero", () => {
		expect(campoPagamentoVazio(null)).toBe(true);
		expect(campoPagamentoVazio("")).toBe(true);
		expect(campoPagamentoVazio("0")).toBe(true);
		expect(campoPagamentoVazio("10.00")).toBe(false);
	});
});

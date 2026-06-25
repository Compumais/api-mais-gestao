import { describe, expect, it } from "vitest";
import {
	extrairPagamentosResumo,
	somarPagamentosResumo,
} from "@/util/pagamentos-pdv-util.js";

describe("pagamentos-pdv-util", () => {
	it("calcula dinheiro líquido descontando troco", () => {
		const resumo = extrairPagamentosResumo({
			valordinheiro: "100.00",
			valortroco: "10.00",
			valorpix: "0",
			valorcartao: "0",
			valorprepago: "0",
			valortotal: "90.00",
		});

		expect(resumo.dinheiro).toBe(90);
		expect(resumo.pix).toBe(0);
		expect(resumo.total).toBe(90);
	});

	it("soma pagamentos de múltiplas vendas", () => {
		const a = extrairPagamentosResumo({
			valordinheiro: "50.00",
			valortroco: "0",
			valorpix: "20.00",
		});
		const b = extrairPagamentosResumo({
			valordinheiro: "30.00",
			valortroco: "5.00",
			valorpix: "10.00",
		});

		const total = somarPagamentosResumo(a, b);

		expect(total.dinheiro).toBe(75);
		expect(total.pix).toBe(30);
	});

	it("soma cartão crédito, débito e legado no resumo", () => {
		const resumo = extrairPagamentosResumo({
			valorcartaocredito: "50.14",
			valorcartaodebito: "10.00",
			valorcartao: "5.00",
		});

		expect(resumo.cartao).toBe(65.14);
	});
});

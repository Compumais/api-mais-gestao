import { describe, expect, it } from "vitest";
import {
	acumularPagamentoPorTPag,
	criarPagamentosVendaPdvZerados,
} from "@/util/mapear-pagamento-nf-venda-pdv.js";

describe("mapear-pagamento-nf-venda-pdv", () => {
	it("deve mapear dinheiro e pix para campos da venda PDV", () => {
		let pagamentos = criarPagamentosVendaPdvZerados(150);
		pagamentos = acumularPagamentoPorTPag(pagamentos, "01", 100);
		pagamentos = acumularPagamentoPorTPag(pagamentos, "17", 50);

		expect(pagamentos.valordinheiro).toBe("100.00");
		expect(pagamentos.valorpix).toBe("50.00");
		expect(pagamentos.valortotal).toBe("150.00");
	});
});

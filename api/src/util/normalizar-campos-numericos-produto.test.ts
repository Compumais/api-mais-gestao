import { describe, expect, it } from "vitest";
import { normalizarCamposNumericosProduto } from "./normalizar-campos-numericos-produto.js";

describe("normalizarCamposNumericosProduto", () => {
	it("converte strings vazias em null nas colunas numeric", () => {
		const resultado = normalizarCamposNumericosProduto({
			nome: "Teste",
			preco: "",
			custoaquisicao: "",
			percentualmva: "",
			comissao: "",
			aliquotaicmsinterna: "18.00",
		});

		expect(resultado.preco).toBeNull();
		expect(resultado.custoaquisicao).toBeNull();
		expect(resultado.percentualmva).toBeNull();
		expect(resultado.comissao).toBeNull();
		expect(resultado.aliquotaicmsinterna).toBe("18.00");
		expect(resultado.nome).toBe("Teste");
	});
});

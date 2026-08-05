import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	camposServicoProdutoSchema,
	montarCamposServicoProduto,
} from "./campos-servico-produto.js";

const schemaCamposServico = z.object(camposServicoProdutoSchema);

describe("montarCamposServicoProduto", () => {
	it("preserva flags e códigos fiscais", () => {
		const resultado = montarCamposServicoProduto({
			itemrapido: 1,
			podeserbrinde: 0,
			inativo: 0,
			comissao: "10.00",
			aliquotaiss: "5.50",
			codigolistalc11603: "0101",
			codigotributacaonacional: "010101",
			codigonbs: "115021000",
			exigibilidadeiss: "1",
			incentivofiscal: 1,
		});

		expect(resultado.itemrapido).toBe(1);
		expect(resultado.podeserbrinde).toBe(0);
		expect(resultado.comissao).toBe("10.00");
		expect(resultado.aliquotaiss).toBe("5.50");
		expect(resultado.codigolistalc11603).toBe("0101");
		expect(resultado.incentivofiscal).toBe(1);
	});

	it("converte textos vazios em null", () => {
		const resultado = montarCamposServicoProduto({
			nomeecf: "   ",
			processoisencaoiss: "",
			tipoimpressaogourmet: null,
		});
		expect(resultado.nomeecf).toBeNull();
		expect(resultado.processoisencaoiss).toBeNull();
		expect(resultado.tipoimpressaogourmet).toBeNull();
	});
});

describe("camposServicoProdutoSchema", () => {
	it("aceita payload de criação/atualização de serviço", () => {
		const resultado = schemaCamposServico.safeParse({
			itemrapido: 0,
			podeserbrinde: 0,
			inativo: 0,
			nomeecf: "Serviço PDV",
			decimaispreco: 2,
			codigolistalc11603: "01.01",
			codigotributacaonacional: "010101",
			codigonbs: "115021000",
			cicloposvenda: 30,
			comissao: 10,
			comissaoavista: "5",
			comissaoprazo: "7.5",
			percentualcomissaoquitacao: "1",
			situacaoiss: "1",
			aliquotaiss: "5",
			exigibilidadeiss: "1",
			processoisencaoiss: null,
			incentivofiscal: 0,
			codigomunicipalservico: "1234",
			tipoimpressaogourmet: "Cozinha",
			aliquotapis: "0.65",
			aliquotacofins: "3",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.data.codigolistalc11603).toBe("0101");
			expect(resultado.data.comissao).toBe("10.00");
			expect(resultado.data.aliquotaiss).toBe("5.00");
		}
	});

	it("rejeita cTribNac e NBS com tamanho inválido", () => {
		expect(
			schemaCamposServico.safeParse({
				codigotributacaonacional: "123",
			}).success,
		).toBe(false);
		expect(
			schemaCamposServico.safeParse({
				codigonbs: "12345678",
			}).success,
		).toBe(false);
	});

	it("rejeita flags fora de 0|1 e percentuais negativos", () => {
		expect(
			schemaCamposServico.safeParse({
				itemrapido: 2,
			}).success,
		).toBe(false);
		expect(
			schemaCamposServico.safeParse({
				comissao: -1,
			}).success,
		).toBe(false);
	});
});

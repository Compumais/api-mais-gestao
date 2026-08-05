import { describe, expect, it } from "vitest";
import { emissaoNfseSchema } from "./nfse-emissao.schema";

describe("emissaoNfseSchema com origem OS", () => {
	it("preserva itens, origem e financeiro desabilitado", () => {
		const resultado = emissaoNfseSchema.parse({
			iddestinatario: "11111111-1111-4111-8111-111111111111",
			idordemservico: "22222222-2222-4222-8222-222222222222",
			itemListaServico: "0101",
			discriminacao: "2 x Consultoria",
			codigoTributacaoNacional: "010101",
			codigoNbs: "115021000",
			exigibilidadeIss: "1",
			issRetido: "2",
			valores: {
				servicos: 200,
				iss: 10,
				aliquota: 5,
			},
			itens: [
				{
					descricao: "Consultoria",
					quantidade: 2,
					valorUnitario: 100,
					codigoListaLc11603: "0101",
				},
			],
			gerarFinanceiro: false,
		});

		expect(resultado.idordemservico).toBe(
			"22222222-2222-4222-8222-222222222222",
		);
		expect(resultado.itens).toHaveLength(1);
		expect(resultado.gerarFinanceiro).toBe(false);
	});
});

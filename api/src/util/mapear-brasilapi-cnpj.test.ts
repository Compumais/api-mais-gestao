import { describe, expect, it } from "vitest";
import { mapearBrasilApiParaOpenCnpjDados } from "./mapear-brasilapi-cnpj.js";

describe("mapearBrasilApiParaOpenCnpjDados", () => {
	it("mapeia campos principais e CNAEs", () => {
		const dados = mapearBrasilApiParaOpenCnpjDados({
			cnpj: "24.334.591/0001-00",
			razao_social: "EMPRESA TESTE LTDA",
			nome_fantasia: "TESTE",
			descricao_situacao_cadastral: "ATIVA",
			municipio: "UBERLANDIA",
			uf: "MG",
			cep: "38400-000",
			opcao_pelo_simples: true,
			opcao_pelo_mei: false,
			cnae_fiscal: 6201501,
			cnae_fiscal_descricao: "Desenvolvimento de software",
			cnaes_secundarios: [{ codigo: 6311900, descricao: "Portais" }],
			qsa: [
				{
					nome_socio: "SOCIO TESTE",
					qualificacao_socio: "Sócio-Administrador",
					cnpj_cpf_do_socio: "***123456**",
				},
			],
		});

		expect(dados.cnpj).toBe("24334591000100");
		expect(dados.razaoSocial).toBe("EMPRESA TESTE LTDA");
		expect(dados.opcaoSimples).toBe("S");
		expect(dados.opcaoMei).toBe("N");
		expect(dados.cnaes).toHaveLength(2);
		expect(dados.socios[0]?.nomeSocio).toBe("SOCIO TESTE");
	});
});

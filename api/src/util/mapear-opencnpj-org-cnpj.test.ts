import { describe, expect, it } from "vitest";
import { mapearOpenCnpjOrgParaOpenCnpjDados } from "./mapear-opencnpj-org-cnpj.js";

describe("mapearOpenCnpjOrgParaOpenCnpjDados", () => {
	it("mapeia campos principais, telefone, CNAEs e sócios", () => {
		const dados = mapearOpenCnpjOrgParaOpenCnpjDados({
			cnpj: "00.000.000/0001-91",
			razao_social: "BANCO DO BRASIL SA",
			nome_fantasia: "DIRECAO GERAL",
			situacao_cadastral: "Ativa",
			data_situacao_cadastral: "2005-11-03",
			motivo_situacao_cadastral: {
				codigo: "00",
				descricao: "SEM MOTIVO",
			},
			matriz_filial: "Matriz",
			data_inicio_atividade: "1966-08-01",
			natureza_juridica: "Sociedade de Economia Mista",
			capital_social: "120000000000,00",
			email: "SECEX@BB.COM.BR",
			telefones: [
				{ ddd: "61", numero: "34939002", is_fax: false },
				{ ddd: "61", numero: "34931040", is_fax: true },
			],
			tipo_logradouro: "QUADRA",
			logradouro: "SAUN QUADRA 5 BLOCO B",
			numero: "SN",
			complemento: "ANDAR T I",
			bairro: "ASA NORTE",
			municipio: "BRASILIA",
			uf: "DF",
			cep: "70040912",
			situacao_especial: "",
			data_situacao_especial: "",
			opcao_simples: "N",
			opcao_mei: "N",
			cnaes: [
				{
					codigo: "6422100",
					descricao: "Bancos múltiplos, com carteira comercial",
					is_principal: true,
				},
				{
					codigo: "6499999",
					descricao: "Outras atividades",
					is_principal: false,
				},
			],
			QSA: [
				{
					nome_socio: "SOCIO TESTE",
					qualificacao_socio: "Diretor",
					cnpj_cpf_socio: "***123456**",
					data_entrada_sociedade: "2020-07-10",
					nome_representante: "",
					faixa_etaria: "41 a 50 anos",
				},
			],
		});

		expect(dados.cnpj).toBe("00000000000191");
		expect(dados.razaoSocial).toBe("BANCO DO BRASIL SA");
		expect(dados.nomeFantasia).toBe("DIRECAO GERAL");
		expect(dados.motivoSituacaoCadastral).toBe("SEM MOTIVO");
		expect(dados.capitalSocial).toBe(120000000000);
		expect(dados.telefone).toBe("(61) 34939002");
		expect(dados.logradouro).toBe("QUADRA SAUN QUADRA 5 BLOCO B");
		expect(dados.situacaoEspecial).toBeNull();
		expect(dados.opcaoSimples).toBe("N");
		expect(dados.cnaes).toHaveLength(2);
		expect(dados.socios[0]?.nomeSocio).toBe("SOCIO TESTE");
		expect(dados.socios[0]?.nomeRepresentante).toBeNull();
	});

	it("não duplica tipo de logradouro quando já presente", () => {
		const dados = mapearOpenCnpjOrgParaOpenCnpjDados({
			cnpj: "00000000000191",
			razao_social: "TESTE",
			tipo_logradouro: "RUA",
			logradouro: "RUA DAS FLORES",
		});

		expect(dados.logradouro).toBe("RUA DAS FLORES");
	});
});

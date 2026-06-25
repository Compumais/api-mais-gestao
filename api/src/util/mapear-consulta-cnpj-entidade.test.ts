import { describe, expect, it } from "vitest";
import type { OpenCnpjDados } from "@/model/consulta-cnpj-model.js";
import {
	mapearEntidadeConsultaCnpj,
	mapearExtrasConsultaCnpj,
} from "@/util/mapear-consulta-cnpj-entidade.js";

const dadosOpenCnpjMock: OpenCnpjDados = {
	cnpj: "10579611000190",
	situacaoCadastral: "Ativa",
	dataSituacaoCadastral: "07/01/2009",
	motivoSituacaoCadastral: "SEM MOTIVO",
	razaoSocial: "COMPUMAIS INFORMATICA LTDA",
	nomeFantasia: "COMPUMAIS",
	dataInicioAtividades: "07/01/2009",
	matriz: "Sim",
	naturezaJuridica: "Sociedade Empresária Limitada (2062)",
	capitalSocial: 20000,
	email: "GERENCIA@ATMCONTABILIDADE.COM.BR",
	telefone: "(34) 33511861",
	logradouro: "AVENIDA CORONEL JOSE AFONSO DE ALMEIDA",
	numero: "143",
	complemento: "LETRA: B;",
	bairro: "CENTRO",
	municipio: "SACRAMENTO",
	uf: "MG",
	cep: "38190-000",
	dataSituacaoEspecial: null,
	situacaoEspecial: null,
	opcaoSimples: "S",
	opcaoMei: "N",
	cnaes: [
		{
			cnae: "4751201",
			descricao:
				"Comércio varejista especializado de equipamentos e suprimentos de informática",
		},
	],
	socios: [
		{
			nomeSocio: "CAROLINA CARDOSO BORGES",
			descricao: "Sócio",
			identificadorSocio: 2,
			cnpjCpfSocio: "***433246**",
			dataEntradaSociedade: "07/01/2009",
			nomeRepresentante: null,
			faixaEtaria: "41-50 anos",
		},
	],
};

describe("mapearConsultaCnpjEntidade", () => {
	it("deve mapear campos da entidade com truncamento e localidade", () => {
		const entidade = mapearEntidadeConsultaCnpj(dadosOpenCnpjMock, {
			cidade: "SACRAMENTO",
			estado: "Minas Gerais",
			idestado: "MG",
			idcidade: "3156905",
		});

		expect(entidade).toEqual({
			cnpjcpf: "10579611000190",
			nome: "COMPUMAIS",
			razaosocial: "COMPUMAIS INFORMATICA LTDA",
			tipopessoa: 1,
			email: "GERENCIA@ATMCONTABILIDADE.COM.BR",
			telefone: "(34) 33511861",
			endereco: "AVENIDA CORONEL JOSE AFONSO DE ALMEIDA",
			numeroendereco: "143",
			complemento: "LETRA: B;",
			bairro: "CENTRO",
			cep: "38190000",
			cidade: "SACRAMENTO",
			estado: "Minas Gerais",
			idestado: "MG",
			idcidade: "3156905",
			indiedest: 9,
		});
	});

	it("deve usar razão social como nome quando fantasia estiver vazia", () => {
		const entidade = mapearEntidadeConsultaCnpj(
			{ ...dadosOpenCnpjMock, nomeFantasia: null },
			{
				cidade: null,
				estado: null,
				idestado: null,
				idcidade: null,
			},
		);

		expect(entidade.nome).toBe("COMPUMAIS INFORMATICA LTDA");
	});

	it("deve mapear extras com CNAEs e sócios", () => {
		const extras = mapearExtrasConsultaCnpj(dadosOpenCnpjMock);

		expect(extras.situacaoCadastral).toBe("Ativa");
		expect(extras.opcaoSimples).toBe("S");
		expect(extras.cnaes).toHaveLength(1);
		expect(extras.socios[0]?.nomeSocio).toBe("CAROLINA CARDOSO BORGES");
	});
});

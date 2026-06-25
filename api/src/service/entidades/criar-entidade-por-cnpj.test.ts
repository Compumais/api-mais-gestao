import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entidade } from "@/model/entidade-model.js";
import type { ConsultaCnpjEntidade } from "@/model/consulta-cnpj-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as consultarCnpjEntidade from "@/service/entidades/consultar-cnpj-entidade.js";
import * as criarEntidade from "@/service/entidades/criar-entidade.js";
import { criarEntidadePorCnpjService } from "./criar-entidade-por-cnpj.js";

vi.mock("@/service/entidades/consultar-cnpj-entidade.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/service/entidades/criar-entidade.js");

const consultaMock: ConsultaCnpjEntidade = {
	entidade: {
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
	},
	extras: {
		situacaoCadastral: "Ativa",
		dataSituacaoCadastral: "07/01/2009",
		dataInicioAtividades: "07/01/2009",
		naturezaJuridica: "Sociedade Empresária Limitada (2062)",
		capitalSocial: 20000,
		opcaoSimples: "S",
		opcaoMei: "N",
		cnaes: [],
		socios: [],
	},
	jaCadastrada: null,
};

const entidadeMock: Entidade = {
	id: "entidade-123",
	nome: "COMPUMAIS",
	razaosocial: "COMPUMAIS INFORMATICA LTDA",
	tipopessoa: 1,
	cnpjcpf: "10579611000190",
	inscricaoestadual: null,
	rg: null,
	email: "GERENCIA@ATMCONTABILIDADE.COM.BR",
	telefone: "(34) 33511861",
	endereco: "AVENIDA CORONEL JOSE AFONSO DE ALMEIDA",
	numeroendereco: "143",
	complemento: "LETRA: B;",
	bairro: "CENTRO",
	idcidade: "3156905",
	idestado: "MG",
	cep: "38190000",
	fax: null,
	nascimento: null,
	idplanocontas: null,
	pais: null,
	cliente: 1,
	fornecedor: 0,
	transportador: 0,
	representante: 0,
	indiedest: 9,
	idempresa: "empresa-123",
	criadoem: new Date().toISOString(),
	atualizadoem: new Date().toISOString(),
};

describe("criarEntidadePorCnpjService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve criar entidade PJ com sucesso", async () => {
		vi.mocked(consultarCnpjEntidade.obterConsultaCnpjEntidade).mockResolvedValue(
			{
				success: true,
				status: 200,
				body: consultaMock,
			},
		);
		vi.mocked(entidadeRepository.buscarEntidadePorCnpj).mockResolvedValue(
			undefined,
		);
		vi.mocked(criarEntidade.criarEntidadeService).mockResolvedValue({
			success: true,
			status: 201,
			body: entidadeMock,
		});

		const resultado = await criarEntidadePorCnpjService({
			cnpj: "10579611000190",
			idempresa: "empresa-123",
			idusuario: "usuario-123",
			cliente: 1,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(entidadeMock);
		}
		expect(criarEntidade.criarEntidadeService).toHaveBeenCalledWith(
			expect.objectContaining({
				dadosEntidade: expect.objectContaining({
					cnpjcpf: "10579611000190",
					tipopessoa: 1,
					cliente: 1,
					idempresa: "empresa-123",
				}),
				idusuario: "usuario-123",
			}),
		);
	});

	it("deve retornar 422 quando situação cadastral não for Ativa", async () => {
		vi.mocked(consultarCnpjEntidade.obterConsultaCnpjEntidade).mockResolvedValue(
			{
				success: true,
				status: 200,
				body: {
					...consultaMock,
					extras: {
						...consultaMock.extras,
						situacaoCadastral: "Baixada",
					},
				},
			},
		);

		const resultado = await criarEntidadePorCnpjService({
			cnpj: "10579611000190",
			idempresa: "empresa-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(422);
			expect(resultado.code).toBe("CNPJ_INATIVO");
		}
		expect(criarEntidade.criarEntidadeService).not.toHaveBeenCalled();
	});

	it("deve retornar 409 quando CNPJ já estiver cadastrado", async () => {
		vi.mocked(consultarCnpjEntidade.obterConsultaCnpjEntidade).mockResolvedValue(
			{
				success: true,
				status: 200,
				body: consultaMock,
			},
		);
		vi.mocked(entidadeRepository.buscarEntidadePorCnpj).mockResolvedValue(
			entidadeMock,
		);

		const resultado = await criarEntidadePorCnpjService({
			cnpj: "10579611000190",
			idempresa: "empresa-123",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
		}
		expect(criarEntidade.criarEntidadeService).not.toHaveBeenCalled();
	});
});

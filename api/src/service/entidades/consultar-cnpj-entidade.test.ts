import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenCnpjDados } from "@/model/consulta-cnpj-model.js";
import * as openCnpjClient from "@/lib/opencnpj-client.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as brasilApiClient from "@/service/localidade/brasil-api-client.js";
import { consultarCnpjEntidadeService } from "./consultar-cnpj-entidade.js";

vi.mock("@/lib/opencnpj-client.js");
vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/service/localidade/brasil-api-client.js");

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
	cnaes: [],
	socios: [],
};

describe("consultarCnpjEntidadeService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve consultar CNPJ e resolver município", async () => {
		vi.mocked(openCnpjClient.buscarCnpjOpenCnpj).mockResolvedValue(
			dadosOpenCnpjMock,
		);
		vi.mocked(brasilApiClient.buscarMunicipiosBrasilApi).mockResolvedValue([
			{ nome: "Sacramento", codigo_ibge: "3156905" },
		]);

		const resultado = await consultarCnpjEntidadeService({
			cnpj: "10.579.611/0001-90",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.entidade.cnpjcpf).toBe("10579611000190");
			expect(resultado.body?.entidade.idcidade).toBe("3156905");
			expect(resultado.body?.entidade.idestado).toBe("MG");
			expect(resultado.body?.jaCadastrada).toBeNull();
		}
	});

	it("deve retornar jaCadastrada quando CNPJ já existir na empresa", async () => {
		vi.mocked(openCnpjClient.buscarCnpjOpenCnpj).mockResolvedValue(
			dadosOpenCnpjMock,
		);
		vi.mocked(brasilApiClient.buscarMunicipiosBrasilApi).mockResolvedValue([
			{ nome: "Sacramento", codigo_ibge: "3156905" },
		]);
		vi.mocked(entidadeRepository.buscarEntidadePorCnpj).mockResolvedValue({
			id: "entidade-existente",
		} as Awaited<ReturnType<typeof entidadeRepository.buscarEntidadePorCnpj>>);

		const resultado = await consultarCnpjEntidadeService({
			cnpj: "10579611000190",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.jaCadastrada).toEqual({
				id: "entidade-existente",
			});
		}
	});

	it("deve retornar 400 para CNPJ inválido", async () => {
		const resultado = await consultarCnpjEntidadeService({
			cnpj: "123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
		}
		expect(openCnpjClient.buscarCnpjOpenCnpj).not.toHaveBeenCalled();
	});

	it("deve retornar 404 quando CNPJ não for encontrado", async () => {
		vi.mocked(openCnpjClient.buscarCnpjOpenCnpj).mockRejectedValue(
			new openCnpjClient.OpenCnpjNaoEncontradoError("10579611000190"),
		);

		const resultado = await consultarCnpjEntidadeService({
			cnpj: "10579611000190",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
		}
	});

	it("deve retornar 502 quando OpenCNPJ falhar", async () => {
		vi.mocked(openCnpjClient.buscarCnpjOpenCnpj).mockRejectedValue(
			new openCnpjClient.OpenCnpjErroConsultaError("Timeout"),
		);

		const resultado = await consultarCnpjEntidadeService({
			cnpj: "10579611000190",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(502);
		}
	});
});

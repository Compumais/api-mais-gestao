import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Empresa } from "@/model/empresa-model.js";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import * as planoContasPadraoService from "../planocontas/criar-plano-contas-padrao.js";
import { criarEmpresaService } from "./criar-empresa.js";

vi.mock("@/repositories/empresa-repositories");
vi.mock("../planocontas/criar-plano-contas-padrao.js");

describe("criarEmpresaService", () => {
	const empresaMock: Empresa = {
		id: "empresa-123",
		nome: "Empresa Teste",
		cnpj: "12.345.678/0001-90",
		telefone: "(34) 99999-9999",
		email: "contato@empresa.com",
		endereco: "Rua Exemplo, 123",
		idproprietario: "proprietario-1",
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
	};

	const proprietarioMock = {
		id: "proprietario-1",
		nome: "Proprietário Teste",
		email: "proprietario@example.com",
		emailverificado: true,
		perfil: ["proprietario"] as string[],
		criadoem: new Date(),
		atualizadoem: new Date(),
		imagem: null as string | null,
		maxempresas: 5 as number | null,
		plano: "plano-1" as string | null,
		plano_inicio_ciclo: new Date().toISOString() as string | null,
		plano_fim_ciclo: new Date().toISOString() as string | null,
		plano_proximo: "plano-2" as string | null,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			planoContasPadraoService.criarPlanoContasPadraoService,
		).mockResolvedValue([]);
	});

	it("deve criar uma empresa com sucesso quando dentro do limite", async () => {
		vi.mocked(empresaRepository.criarEmpresa).mockResolvedValue([empresaMock]);

		const resultado = await criarEmpresaService({
			dadosEmpresa: {
				id: "empresa-123",
				cnpj: "12.345.678/0001-90",
				nome: "Empresa Teste",
				idproprietario: "proprietario-1",
				telefone: "(34) 99999-9999",
				atualizadoem: new Date().toISOString(),
				criadoem: new Date().toISOString(),
			},
			proprietario: proprietarioMock,
			quantidadeEmpresas: 2, // Já tem 2 empresas, limite é 5, pode criar
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(empresaMock);
		}
		expect(empresaRepository.criarEmpresa).toHaveBeenCalledTimes(1);
		expect(
			planoContasPadraoService.criarPlanoContasPadraoService,
		).toHaveBeenCalledWith("empresa-123");
	});

	it("deve retornar erro quando limite de empresas é excedido", async () => {
		const resultado = await criarEmpresaService({
			dadosEmpresa: {
				id: "empresa-123",
				cnpj: "12.345.678/0001-90",
				nome: "Empresa Teste",
				idproprietario: "proprietario-1",
				telefone: "(34) 99999-9999",
				atualizadoem: new Date().toISOString(),
				criadoem: new Date().toISOString(),
			},
			proprietario: {
				...proprietarioMock,
				maxempresas: 3,
				plano: "plano-1",
				plano_inicio_ciclo: new Date().toISOString(),
				plano_fim_ciclo: new Date().toISOString(),
				plano_proximo: "plano-2",
			},
			quantidadeEmpresas: 3, // Já tem 3 empresas, limite é 3, não pode criar mais
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(429);
			expect(resultado.error).toBe("Limite excedido");
			expect(resultado.code).toBe("LIMIT_EXCEEDED");
		}
		expect(empresaRepository.criarEmpresa).not.toHaveBeenCalled();
	});

	it("deve permitir criar empresa quando maxempresas é null ou undefined", async () => {
		vi.mocked(empresaRepository.criarEmpresa).mockResolvedValue([empresaMock]);

		const resultado = await criarEmpresaService({
			dadosEmpresa: {
				id: "empresa-123",
				cnpj: "12.345.678/0001-90",
				nome: "Empresa Teste",
				idproprietario: "proprietario-1",
				telefone: "(34) 99999-9999",
				atualizadoem: new Date().toISOString(),
				criadoem: new Date().toISOString(),
			},
			proprietario: {
				...proprietarioMock,
				maxempresas: null,
				plano: "plano-1",
				plano_inicio_ciclo: new Date().toISOString(),
				plano_fim_ciclo: new Date().toISOString(),
				plano_proximo: "plano-2",
			},
			quantidadeEmpresas: 10, // Sem limite, pode criar
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(empresaMock);
		}
		expect(empresaRepository.criarEmpresa).toHaveBeenCalledTimes(1);
		expect(
			planoContasPadraoService.criarPlanoContasPadraoService,
		).toHaveBeenCalledWith("empresa-123");
	});
});

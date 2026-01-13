import { beforeEach, describe, expect, it, vi } from "vitest";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import { listarContasCorrentesService } from "./listar-contas-correntes.js";

vi.mock("@/repositories/conta-corrente-repositories.js");

describe("listarContasCorrentesService", () => {
	const contasCorrentesMock = [
		{
			id: "conta-corrente-1",
			agencia: "1234",
			descricao: "Conta Principal",
		},
		{
			id: "conta-corrente-2",
			agencia: "5678",
			descricao: "Conta Secundária",
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar contas correntes com sucesso", async () => {
		vi.mocked(
			contaCorrenteRepository.listarContaCorrentePorEmpresa,
		).mockResolvedValue({
			contasCorrentes: contasCorrentesMock,
			total: 2,
		});

		const resultado = await listarContasCorrentesService({
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toEqual(contasCorrentesMock);
			expect(resultado.body?.paginacao.total).toBe(2);
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
		expect(
			contaCorrenteRepository.listarContaCorrentePorEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			contaCorrenteRepository.listarContaCorrentePorEmpresa,
		).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			page: 1,
			limit: 10,
		});
	});

	it("deve calcular paginação corretamente", async () => {
		vi.mocked(
			contaCorrenteRepository.listarContaCorrentePorEmpresa,
		).mockResolvedValue({
			contasCorrentes: contasCorrentesMock,
			total: 25,
		});

		const resultado = await listarContasCorrentesService({
			idempresa: "empresa-123",
			page: 2,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.total).toBe(25);
			expect(resultado.body?.paginacao.page).toBe(2);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.totalPages).toBe(3);
		}
		expect(
			contaCorrenteRepository.listarContaCorrentePorEmpresa,
		).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			page: 2,
			limit: 10,
		});
	});

	it("deve usar valores padrão de paginação quando não fornecidos", async () => {
		vi.mocked(
			contaCorrenteRepository.listarContaCorrentePorEmpresa,
		).mockResolvedValue({
			contasCorrentes: contasCorrentesMock,
			total: 2,
		});

		const resultado = await listarContasCorrentesService({
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
		}
		expect(
			contaCorrenteRepository.listarContaCorrentePorEmpresa,
		).toHaveBeenCalledWith({
			idempresas: ["empresa-123"],
			page: 1,
			limit: 10,
		});
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Empresa } from "@/model/empresa-model.js";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import { listarEmpresasService } from "./listar-empresas.js";

vi.mock("@/repositories/empresa-repositories.js");

describe("listarEmpresasService", () => {
	const empresasMock: Empresa[] = [
		{
			id: "empresa-1",
			nome: "Empresa Um",
			cnpj: "11.111.111/0001-11",
			telefone: "(34) 11111-1111",
			proprietarioId: "proprietario-1",
			criadoEm: new Date().toISOString(),
			atualizadoEm: new Date().toISOString(),
		},
		{
			id: "empresa-2",
			nome: "Empresa Dois",
			cnpj: "22.222.222/0001-22",
			telefone: "(34) 22222-2222",
			proprietarioId: "proprietario-1",
			criadoEm: new Date().toISOString(),
			atualizadoEm: new Date().toISOString(),
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar empresas sem filtros usando valores padrão", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: empresasMock,
			total: 2,
		});

		const resultado = await listarEmpresasService({});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toEqual(empresasMock);
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.total).toBe(2);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
		expect(empresaRepository.listarEmpresas).toHaveBeenCalledTimes(1);
		expect(empresaRepository.listarEmpresas).toHaveBeenCalledWith({
			proprietarioId: undefined,
			nome: undefined,
			cnpj: undefined,
			telefone: undefined,
			page: 1,
			limit: 10,
		});
	});

	it("deve listar empresas com filtro de proprietarioId", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: empresasMock,
			total: 2,
		});

		const resultado = await listarEmpresasService({
			proprietarioId: "proprietario-1",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toEqual(empresasMock);
		}
		expect(empresaRepository.listarEmpresas).toHaveBeenCalledWith({
			proprietarioId: "proprietario-1",
			nome: undefined,
			cnpj: undefined,
			telefone: undefined,
			page: 1,
			limit: 10,
		});
	});

	it("deve listar empresas com filtro de nome", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: [empresasMock[0]!],
			total: 1,
		});

		const resultado = await listarEmpresasService({
			nome: "Empresa Um",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(1);
		}
		expect(empresaRepository.listarEmpresas).toHaveBeenCalledWith({
			proprietarioId: undefined,
			nome: "Empresa Um",
			cnpj: undefined,
			telefone: undefined,
			page: 1,
			limit: 10,
		});
	});

	it("deve listar empresas com filtro de cnpj", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: [empresasMock[0]!],
			total: 1,
		});

		const resultado = await listarEmpresasService({
			cnpj: "11.111.111/0001-11",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
		}
		expect(empresaRepository.listarEmpresas).toHaveBeenCalledWith({
			proprietarioId: undefined,
			nome: undefined,
			cnpj: "11.111.111/0001-11",
			telefone: undefined,
			page: 1,
			limit: 10,
		});
	});

	it("deve listar empresas com filtro de telefone", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: [empresasMock[0]!],
			total: 1,
		});

		const resultado = await listarEmpresasService({
			telefone: "11111",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
		}
		expect(empresaRepository.listarEmpresas).toHaveBeenCalledWith({
			proprietarioId: undefined,
			nome: undefined,
			cnpj: undefined,
			telefone: "11111",
			page: 1,
			limit: 10,
		});
	});

	it("deve listar empresas com múltiplos filtros", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: empresasMock,
			total: 2,
		});

		const resultado = await listarEmpresasService({
			proprietarioId: "proprietario-1",
			nome: "Empresa",
			cnpj: "11.111.111/0001-11",
			telefone: "11111",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
		}
		expect(empresaRepository.listarEmpresas).toHaveBeenCalledWith({
			proprietarioId: "proprietario-1",
			nome: "Empresa",
			cnpj: "11.111.111/0001-11",
			telefone: "11111",
			page: 1,
			limit: 10,
		});
	});

	it("deve listar empresas com paginação customizada", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: empresasMock,
			total: 25,
		});

		const resultado = await listarEmpresasService({
			page: 2,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.paginacao.page).toBe(2);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.total).toBe(25);
			expect(resultado.body?.paginacao.totalPages).toBe(3);
		}
		expect(empresaRepository.listarEmpresas).toHaveBeenCalledWith({
			proprietarioId: undefined,
			nome: undefined,
			cnpj: undefined,
			telefone: undefined,
			page: 2,
			limit: 10,
		});
	});

	it("deve calcular totalPages corretamente com arredondamento para cima", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: empresasMock,
			total: 25,
		});

		const resultado = await listarEmpresasService({
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.totalPages).toBe(3); // 25 / 10 = 2.5, arredondado para cima = 3
		}
	});

	it("deve retornar 0 páginas quando total é 0", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: [],
			total: 0,
		});

		const resultado = await listarEmpresasService({});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.total).toBe(0);
			expect(resultado.body?.paginacao.totalPages).toBe(0);
			expect(resultado.body?.data).toEqual([]);
		}
	});

	it("deve retornar 1 página quando total é igual ao limit", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: empresasMock,
			total: 10,
		});

		const resultado = await listarEmpresasService({
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.total).toBe(10);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
	});

	it("deve retornar estrutura de resposta correta com data e paginacao", async () => {
		vi.mocked(empresaRepository.listarEmpresas).mockResolvedValue({
			empresas: empresasMock,
			total: 2,
		});

		const resultado = await listarEmpresasService({});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toHaveProperty("data");
			expect(resultado.body).toHaveProperty("paginacao");
			expect(resultado.body?.paginacao).toHaveProperty("page");
			expect(resultado.body?.paginacao).toHaveProperty("limit");
			expect(resultado.body?.paginacao).toHaveProperty("total");
			expect(resultado.body?.paginacao).toHaveProperty("totalPages");
			expect(Array.isArray(resultado.body?.data)).toBe(true);
		}
	});
});

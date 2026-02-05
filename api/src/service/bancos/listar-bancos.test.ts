import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Banco } from "@/model/banco-model.js";
import * as bancoRepository from "@/repositories/banco-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { listarBancosService } from "./listar-bancos.js";

vi.mock("@/repositories/banco-repositories.js");
vi.mock("@/repositories/entidade-repositories.js");

describe("listarBancosService", () => {
	const bancoMock1: Banco = {
		id: "banco-1",
		codigo: "001",
		nome: "Banco do Brasil",
		currenttimemillis: Date.now(),
		idempresa: "empresa-123",
	};

	const bancoMock2: Banco = {
		id: "banco-2",
		codigo: "237",
		nome: "Banco Bradesco",
		currenttimemillis: Date.now() - 1000,
		idempresa: "empresa-123",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar bancos com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.listarBancos).mockResolvedValue({
			bancos: [bancoMock1, bancoMock2],
			total: 2,
		});

		const resultado = await listarBancosService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(2);
			expect(resultado.body?.data).toEqual([bancoMock1, bancoMock2]);
			expect(resultado.body?.paginacao.total).toBe(2);
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(bancoRepository.listarBancos).toHaveBeenCalledTimes(1);
		expect(bancoRepository.listarBancos).toHaveBeenCalledWith({
			idempresa: "empresa-123",
			nome: undefined,
			page: 1,
			limit: 10,
		});
	});

	it("deve retornar lista vazia quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await listarBancosService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(0);
			expect(resultado.body?.paginacao.total).toBe(0);
			expect(resultado.body?.paginacao.totalPages).toBe(0);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(bancoRepository.listarBancos).not.toHaveBeenCalled();
	});

	it("deve aplicar filtro de nome quando fornecido", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.listarBancos).mockResolvedValue({
			bancos: [bancoMock1],
			total: 1,
		});

		const resultado = await listarBancosService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
			nome: "Brasil",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.data).toHaveLength(1);
		}
		expect(bancoRepository.listarBancos).toHaveBeenCalledWith({
			idempresa: "empresa-123",
			nome: "Brasil",
			page: 1,
			limit: 10,
		});
	});

	it("deve calcular paginação corretamente", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.listarBancos).mockResolvedValue({
			bancos: [bancoMock1],
			total: 25,
		});

		const resultado = await listarBancosService({
			idusuario: "usuario-123",
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
	});

	it("deve usar valores padrão de paginação quando não fornecidos", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.listarBancos).mockResolvedValue({
			bancos: [bancoMock1],
			total: 1,
		});

		const resultado = await listarBancosService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
		}
		expect(bancoRepository.listarBancos).toHaveBeenCalledWith({
			idempresa: "empresa-123",
			nome: undefined,
			page: 1,
			limit: 10,
		});
	});
});

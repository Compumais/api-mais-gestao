import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Banco } from "@/model/banco-model.js";
import * as bancoRepository from "@/repositories/banco-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { criarBancoService } from "./criar-banco.js";

vi.mock("@/repositories/banco-repositories");
vi.mock("@/repositories/entidade-repositories");

describe("criarBancoService", () => {
	const bancoMock: Banco = {
		id: "banco-123",
		codigo: "001",
		nome: "Banco do Brasil",
		currenttimemillis: Date.now(),
		idempresa: "empresa-123",
	};

	const dadosBancoMock = {
		id: "banco-123",
		codigo: "001",
		nome: "Banco do Brasil",
		idempresa: "empresa-123",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve criar banco com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.criarBanco).mockResolvedValue(bancoMock);

		const resultado = await criarBancoService({
			idusuario: "usuario-123",
			dadosBanco: dadosBancoMock,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(bancoMock);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(bancoRepository.criarBanco).toHaveBeenCalledTimes(1);
		expect(bancoRepository.criarBanco).toHaveBeenCalledWith(
			expect.objectContaining({
				...dadosBancoMock,
				currenttimemillis: expect.any(Number),
			}),
		);
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await criarBancoService({
			idusuario: "usuario-123",
			dadosBanco: dadosBancoMock,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(bancoRepository.criarBanco).not.toHaveBeenCalled();
	});

	it("deve retornar erro 500 quando criação falha (retorna null)", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.criarBanco).mockResolvedValue(
			null as unknown as Banco,
		);

		const resultado = await criarBancoService({
			idusuario: "usuario-123",
			dadosBanco: dadosBancoMock,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(500);
			expect(resultado.error).toBe("Erro interno");
			expect(resultado.code).toBe("INTERNAL_SERVER_ERROR");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(bancoRepository.criarBanco).toHaveBeenCalledTimes(1);
	});

	it("deve adicionar currenttimemillis automaticamente", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(bancoRepository.criarBanco).mockResolvedValue(bancoMock);

		await criarBancoService({
			idusuario: "usuario-123",
			dadosBanco: dadosBancoMock,
		});

		expect(bancoRepository.criarBanco).toHaveBeenCalledWith(
			expect.objectContaining({
				currenttimemillis: expect.any(Number),
			}),
		);
	});
});

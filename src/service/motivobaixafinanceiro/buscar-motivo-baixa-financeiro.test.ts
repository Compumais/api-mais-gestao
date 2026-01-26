import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MotivoBaixaFinanceiro } from "@/model/motivo-baixa-financeiro-model.js";
import * as motivoBaixaFinanceiroRepository from "@/repositories/motivo-baixa-financeiro-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { buscarMotivoBaixaFinanceiroService } from "./buscar-motivo-baixa-financeiro.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/motivo-baixa-financeiro-repositories.js");

describe("buscarMotivoBaixaFinanceiroService", () => {
	const motivoMock: MotivoBaixaFinanceiro = {
		id: "motivo-123",
		idempresa: "empresa-123",
		descricao: "Motivo de Baixa Teste",
		inativo: 0,
		currenttimemillis: 1234567890,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve buscar motivo baixa financeiro com sucesso quando encontrado", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).mockResolvedValue(motivoMock);

		const resultado = await buscarMotivoBaixaFinanceiroService({
			id: "motivo-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(motivoMock);
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).toHaveBeenCalledWith("motivo-123");
		expect(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).toHaveBeenCalledTimes(1);
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await buscarMotivoBaixaFinanceiroService({
			id: "motivo-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando motivo não é encontrado", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).mockResolvedValue(undefined);

		const resultado = await buscarMotivoBaixaFinanceiroService({
			id: "motivo-inexistente",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).toHaveBeenCalledWith("motivo-inexistente");
	});

	it("deve retornar motivo completo com todos os campos", async () => {
		const motivoCompleto: MotivoBaixaFinanceiro = {
			id: "motivo-123",
			idempresa: "empresa-123",
			descricao: "Motivo de Baixa Completo",
			inativo: 1,
			currenttimemillis: 1234567890,
		};

		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			motivoBaixaFinanceiroRepository.buscarMotivoBaixaFinanceiroPorId,
		).mockResolvedValue(motivoCompleto);

		const resultado = await buscarMotivoBaixaFinanceiroService({
			id: "motivo-123",
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual(motivoCompleto);
			expect(resultado.body?.descricao).toBe("Motivo de Baixa Completo");
			expect(resultado.body?.inativo).toBe(1);
		}
	});
});


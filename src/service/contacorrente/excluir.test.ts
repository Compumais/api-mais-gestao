import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import { excluirContaCorrenteService } from "./excluir.js";

vi.mock("@/repositories/clientes-repositories.js");
vi.mock("@/repositories/conta-corrente-repositories.js");

describe("excluirContaCorrenteService", () => {
	const contaCorrenteMock: ContaCorrente = {
		id: "conta-corrente-123",
		empresaId: "empresa-123",
		descricao: "Conta Corrente Principal",
		agencia: "1234",
		numeroconta: "56789-0",
		abertura: "2024-01-01",
		observacao: "Conta principal da empresa",
		nometitular: "Empresa XYZ",
		cnpjcpftitular: "12.345.678/0001-90",
		gerente: "João Silva",
		telefonegerente: "(34) 9999-9999",
		codigo: 1,
		idbanco: 1,
		agenciadv: null,
		contadv: null,
		codigocedente: null,
		codigocedentedv: null,
		carteira: null,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve excluir conta corrente com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			contaCorrenteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.excluirContaCorrente).mockResolvedValue(
			contaCorrenteMock,
		);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-123",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(204);
			expect(resultado.body).toBeNull();
		}
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledTimes(
			1,
		);
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledWith({
			id: "conta-corrente-123",
		});
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledWith({
			id: "conta-corrente-123",
		});
	});

	it("deve retornar erro 404 quando conta corrente não é encontrada", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			undefined,
		);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-inexistente",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledTimes(
			1,
		);
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledWith({
			id: "conta-corrente-inexistente",
		});
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(contaCorrenteRepository.excluirContaCorrente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			contaCorrenteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-123",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledTimes(
			1,
		);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.excluirContaCorrente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando exclusão retorna null", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			contaCorrenteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.excluirContaCorrente).mockResolvedValue(
			undefined,
		);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-123",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledTimes(
			1,
		);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledTimes(1);
	});

	it("deve chamar métodos na ordem correta: buscar, verificar, excluir", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			contaCorrenteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.excluirContaCorrente).mockResolvedValue(
			contaCorrenteMock,
		);

		await excluirContaCorrenteService({
			id: "conta-corrente-123",
			userId: "usuario-123",
		});

		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledTimes(
			1,
		);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledWith({
			id: "conta-corrente-123",
		});
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(contaCorrenteRepository.excluirContaCorrente).toHaveBeenCalledWith({
			id: "conta-corrente-123",
		});
	});

	it("deve retornar erro 404 quando conta corrente é null na busca inicial", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			null as any,
		);

		const resultado = await excluirContaCorrenteService({
			id: "conta-corrente-null",
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
		expect(contaCorrenteRepository.excluirContaCorrente).not.toHaveBeenCalled();
	});
});


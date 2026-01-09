import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import { atualizarContaCorrenteService } from "./atualizar-conta-corrente.js";

vi.mock("@/repositories/clientes-repositories.js");
vi.mock("@/repositories/conta-corrente-repositories.js");

describe("atualizarContaCorrenteService", () => {
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

	const contaCorrenteAtualizadaMock: ContaCorrente = {
		...contaCorrenteMock,
		descricao: "Conta Corrente Atualizada",
		agencia: "5678",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve atualizar conta corrente com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			contaCorrenteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.atualizaContaCorrente).mockResolvedValue(
			contaCorrenteAtualizadaMock,
		);

		const resultado = await atualizarContaCorrenteService({
			contaCorrenteId: "conta-corrente-123",
			userId: "usuario-123",
			dados: {
				descricao: "Conta Corrente Atualizada",
				agencia: "5678",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(contaCorrenteAtualizadaMock);
		}
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledTimes(
			1,
		);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.atualizaContaCorrente).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.atualizaContaCorrente).toHaveBeenCalledWith({
			id: "conta-corrente-123",
			dados: {
				descricao: "Conta Corrente Atualizada",
				agencia: "5678",
			},
		});
	});

	it("deve retornar erro 404 quando conta corrente não é encontrada", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			undefined,
		);

		const resultado = await atualizarContaCorrenteService({
			contaCorrenteId: "conta-corrente-inexistente",
			userId: "usuario-123",
			dados: {
				descricao: "Nova Descrição",
			},
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
		).not.toHaveBeenCalled();
		expect(contaCorrenteRepository.atualizaContaCorrente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			contaCorrenteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await atualizarContaCorrenteService({
			contaCorrenteId: "conta-corrente-123",
			userId: "usuario-123",
			dados: {
				descricao: "Nova Descrição",
			},
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
		expect(contaCorrenteRepository.atualizaContaCorrente).not.toHaveBeenCalled();
	});

	it("deve atualizar apenas campos fornecidos", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			contaCorrenteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.atualizaContaCorrente).mockResolvedValue({
			...contaCorrenteMock,
			descricao: "Apenas Descrição Atualizada",
		});

		const resultado = await atualizarContaCorrenteService({
			contaCorrenteId: "conta-corrente-123",
			userId: "usuario-123",
			dados: {
				descricao: "Apenas Descrição Atualizada",
			},
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.descricao).toBe("Apenas Descrição Atualizada");
		}
		expect(contaCorrenteRepository.atualizaContaCorrente).toHaveBeenCalledWith({
			id: "conta-corrente-123",
			dados: {
				descricao: "Apenas Descrição Atualizada",
			},
		});
	});

	it("deve retornar erro 404 quando atualização retorna null", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			contaCorrenteMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.atualizaContaCorrente).mockResolvedValue(
			undefined,
		);

		const resultado = await atualizarContaCorrenteService({
			contaCorrenteId: "conta-corrente-123",
			userId: "usuario-123",
			dados: {
				descricao: "Nova Descrição",
			},
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(contaCorrenteRepository.atualizaContaCorrente).toHaveBeenCalledTimes(1);
	});
});


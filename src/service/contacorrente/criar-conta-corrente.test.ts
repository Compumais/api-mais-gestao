import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import { criarContaCorrenteService } from "./criar-conta-corrente.js";

vi.mock("@/repositories/clientes-repositories.js");
vi.mock("@/repositories/conta-corrente-repositories.js");

describe("criarContaCorrenteService", () => {
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

	const dadosContaCorrenteMock = {
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
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve criar conta corrente com sucesso quando usuário pertence à empresa", async () => {
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.criarContaCorrente).mockResolvedValue(
			contaCorrenteMock,
		);

		const resultado = await criarContaCorrenteService({
			usuarioId: "usuario-123",
			dadosContaCorrente: dadosContaCorrenteMock,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect(resultado.body).toEqual(contaCorrenteMock);
		}
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
		expect(contaCorrenteRepository.criarContaCorrente).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.criarContaCorrente).toHaveBeenCalledWith(
			dadosContaCorrenteMock,
		);
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await criarContaCorrenteService({
			usuarioId: "usuario-123",
			dadosContaCorrente: dadosContaCorrenteMock,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.criarContaCorrente).not.toHaveBeenCalled();
	});

	it("deve retornar erro 500 quando criação falha (retorna null)", async () => {
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaCorrenteRepository.criarContaCorrente).mockResolvedValue(
			null as any,
		);

		const resultado = await criarContaCorrenteService({
			usuarioId: "usuario-123",
			dadosContaCorrente: dadosContaCorrenteMock,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(500);
			expect(resultado.error).toBe("Erro interno");
			expect(resultado.code).toBe("INTERNAL_SERVER_ERROR");
		}
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(contaCorrenteRepository.criarContaCorrente).toHaveBeenCalledTimes(1);
	});
});

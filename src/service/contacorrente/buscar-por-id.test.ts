import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import * as contaCorrenteRepository from "@/repositories/conta-corrente-repositories.js";
import { buscarContaCorrentePorIdService } from "./buscar-por-id.js";

vi.mock("@/repositories/conta-corrente-repositories.js");

describe("buscarContaCorrentePorIdService", () => {
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

	it("deve buscar conta corrente com sucesso quando existe", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			contaCorrenteMock,
		);

		const resultado = await buscarContaCorrentePorIdService({
			id: "conta-corrente-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(contaCorrenteMock);
		}
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledTimes(
			1,
		);
		expect(contaCorrenteRepository.buscarContaCorrentePorId).toHaveBeenCalledWith({
			id: "conta-corrente-123",
		});
	});

	it("deve retornar erro 404 quando conta corrente não existe", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			undefined,
		);

		const resultado = await buscarContaCorrentePorIdService({
			id: "conta-corrente-inexistente",
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
	});

	it("deve retornar erro 404 quando conta corrente é null", async () => {
		vi.mocked(contaCorrenteRepository.buscarContaCorrentePorId).mockResolvedValue(
			null as any,
		);

		const resultado = await buscarContaCorrentePorIdService({
			id: "conta-corrente-null",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
	});
});


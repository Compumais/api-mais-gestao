import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import * as planoContasRepository from "@/repositories/plano-contas-repositories.js";
import { listarPlanoContasService } from "./listar-plano-contas.js";

vi.mock("@/repositories/clientes-repositories.js");
vi.mock("@/repositories/plano-contas-repositories.js");

describe("listarPlanoContasService", () => {
	const planoContasMock1: PlanoContas = {
		id: "plano-1",
		empresaId: "empresa-123",
		codigo: "1",
		nome: "Plano de Contas 1",
		tipomovimento: "D",
		inativo: 0,
		classe: null,
		currenttimemillis: null,
		centrocustoobrigatorio: null,
		tipoconta: null,
		idcontacontabilintegracao: null,
		exportaparacontabilidade: null,
		idgrupodre: null,
		planoContasId: null,
	};

	const planoContasMock2: PlanoContas = {
		id: "plano-2",
		empresaId: "empresa-123",
		codigo: "2",
		nome: "Plano de Contas 2",
		tipomovimento: "C",
		inativo: 0,
		classe: null,
		currenttimemillis: null,
		centrocustoobrigatorio: null,
		tipoconta: null,
		idcontacontabilintegracao: null,
		exportaparacontabilidade: null,
		idgrupodre: null,
		planoContasId: null,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve listar planos de contas com sucesso quando usuário tem empresas", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
			"empresa-456",
		]);
		vi.mocked(
			planoContasRepository.listarPlanoContasPorEmpresas,
		).mockResolvedValue({
			planosContas: [planoContasMock1, planoContasMock2],
			total: 2,
		});

		const resultado = await listarPlanoContasService({
			userId: "usuario-123",
			page: 1,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.data).toHaveLength(2);
			expect(resultado.body?.data).toEqual([
				planoContasMock1,
				planoContasMock2,
			]);
			expect(resultado.body?.paginacao.total).toBe(2);
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.totalPages).toBe(1);
		}
		expect(clienteRepository.buscarEmpresasDoUsuario).toHaveBeenCalledTimes(1);
		expect(clienteRepository.buscarEmpresasDoUsuario).toHaveBeenCalledWith(
			"usuario-123",
		);
		expect(
			planoContasRepository.listarPlanoContasPorEmpresas,
		).toHaveBeenCalledTimes(1);
		expect(
			planoContasRepository.listarPlanoContasPorEmpresas,
		).toHaveBeenCalledWith({
			empresaIds: ["empresa-123", "empresa-456"],
			planoContasId: undefined,
			inativo: "1",
			page: 1,
			limit: 10,
		});
	});

	it("deve retornar lista vazia quando usuário não tem empresas", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([]);

		const resultado = await listarPlanoContasService({
			userId: "usuario-123",
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
		expect(clienteRepository.buscarEmpresasDoUsuario).toHaveBeenCalledTimes(1);
		expect(
			planoContasRepository.listarPlanoContasPorEmpresas,
		).not.toHaveBeenCalled();
	});

	it("deve aplicar paginação corretamente", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(
			planoContasRepository.listarPlanoContasPorEmpresas,
		).mockResolvedValue({
			planosContas: [planoContasMock1],
			total: 25,
		});

		const resultado = await listarPlanoContasService({
			userId: "usuario-123",
			page: 2,
			limit: 10,
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.page).toBe(2);
			expect(resultado.body?.paginacao.limit).toBe(10);
			expect(resultado.body?.paginacao.total).toBe(25);
			expect(resultado.body?.paginacao.totalPages).toBe(3);
		}
		expect(
			planoContasRepository.listarPlanoContasPorEmpresas,
		).toHaveBeenCalledWith({
			empresaIds: ["empresa-123"],
			planoContasId: undefined,
			inativo: "1",
			page: 2,
			limit: 10,
		});
	});

	it("deve usar valores padrão de paginação quando não fornecidos", async () => {
		vi.mocked(clienteRepository.buscarEmpresasDoUsuario).mockResolvedValue([
			"empresa-123",
		]);
		vi.mocked(
			planoContasRepository.listarPlanoContasPorEmpresas,
		).mockResolvedValue({
			planosContas: [planoContasMock1],
			total: 1,
		});

		const resultado = await listarPlanoContasService({
			userId: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.paginacao.page).toBe(1);
			expect(resultado.body?.paginacao.limit).toBe(10);
		}
		expect(
			planoContasRepository.listarPlanoContasPorEmpresas,
		).toHaveBeenCalledWith({
			empresaIds: ["empresa-123"],
			planoContasId: undefined,
			inativo: "1",
			page: 1,
			limit: 10,
		});
	});
});

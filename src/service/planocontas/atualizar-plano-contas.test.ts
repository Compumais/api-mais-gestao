import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import * as clienteRepository from "@/repositories/clientes-repositories.js";
import * as planoContasRepository from "@/repositories/plano-contas-repositories.js";
import { atualizarPlanoContasService } from "./atualizar-plano-contas.js";

vi.mock("@/repositories/clientes-repositories.js");
vi.mock("@/repositories/plano-contas-repositories.js");
vi.mock("@/util/verificar-permissao.js", () => ({
	verificarPermissao: vi.fn(),
}));

describe("atualizarPlanoContasService", () => {
	const planoContasMock: PlanoContas = {
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

	const planoContasAtualizadoMock: PlanoContas = {
		...planoContasMock,
		nome: "Plano de Contas Atualizado",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve atualizar plano de contas com sucesso quando usuário tem permissão", async () => {
		const { verificarPermissao } = await import(
			"@/util/verificar-permissao.js"
		);
		vi.mocked(verificarPermissao).mockReturnValue(true);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planoContasMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(planoContasRepository.atualizarPlanoContas).mockResolvedValue(
			planoContasAtualizadoMock,
		);

		const resultado = await atualizarPlanoContasService({
			planoContasId: "plano-1",
			userId: "usuario-123",
			roles: ["proprietario"],
			dados: { nome: "Plano de Contas Atualizado" },
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body).toEqual(planoContasAtualizadoMock);
		}
		expect(verificarPermissao).toHaveBeenCalledWith(
			["proprietario"],
			["proprietario", "financeiro"],
		);
		expect(planoContasRepository.buscarPlanoContasPorId).toHaveBeenCalledTimes(
			1,
		);
		expect(planoContasRepository.buscarPlanoContasPorId).toHaveBeenCalledWith(
			"plano-1",
		);
		expect(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(planoContasRepository.atualizarPlanoContas).toHaveBeenCalledTimes(1);
	});

	it("deve retornar erro 403 quando usuário não tem permissão", async () => {
		const { verificarPermissao } = await import(
			"@/util/verificar-permissao.js"
		);
		vi.mocked(verificarPermissao).mockReturnValue(false);

		const resultado = await atualizarPlanoContasService({
			planoContasId: "plano-1",
			userId: "usuario-123",
			roles: ["user"],
			dados: { nome: "Plano de Contas Atualizado" },
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(planoContasRepository.buscarPlanoContasPorId).not.toHaveBeenCalled();
	});

	it("deve retornar erro 404 quando plano não existe", async () => {
		const { verificarPermissao } = await import(
			"@/util/verificar-permissao.js"
		);
		vi.mocked(verificarPermissao).mockReturnValue(true);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			undefined,
		);

		const resultado = await atualizarPlanoContasService({
			planoContasId: "plano-inexistente",
			userId: "usuario-123",
			roles: ["proprietario"],
			dados: { nome: "Plano de Contas Atualizado" },
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
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		const { verificarPermissao } = await import(
			"@/util/verificar-permissao.js"
		);
		vi.mocked(verificarPermissao).mockReturnValue(true);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planoContasMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await atualizarPlanoContasService({
			planoContasId: "plano-1",
			userId: "usuario-123",
			roles: ["proprietario"],
			dados: { nome: "Plano de Contas Atualizado" },
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(planoContasRepository.atualizarPlanoContas).not.toHaveBeenCalled();
	});

	it("deve aceitar role financeiro", async () => {
		const { verificarPermissao } = await import(
			"@/util/verificar-permissao.js"
		);
		vi.mocked(verificarPermissao).mockReturnValue(true);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planoContasMock,
		);
		vi.mocked(
			clienteRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(planoContasRepository.atualizarPlanoContas).mockResolvedValue(
			planoContasAtualizadoMock,
		);

		const resultado = await atualizarPlanoContasService({
			planoContasId: "plano-1",
			userId: "usuario-123",
			roles: ["financeiro"],
			dados: { nome: "Plano de Contas Atualizado" },
		});

		expect(resultado.success).toBe(true);
		expect(verificarPermissao).toHaveBeenCalledWith(
			["financeiro"],
			["proprietario", "financeiro"],
		);
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as planoContasRepository from "@/repositories/plano-contas-repositories.js";
import * as verificarPermissaoModule from "@/util/verificar-permissao.js";
import { excluirPlanoContasService } from "./excluir-plano-contas.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/plano-contas-repositories.js");
vi.mock("@/util/verificar-permissao.js", () => ({
	verificarPermissao: vi.fn(),
}));

describe("excluirPlanoContasService", () => {
	const planoContasMock: PlanoContas = {
		id: "plano-1",
		idempresa: "empresa-123",
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
		idplanocontas: null,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve excluir plano de contas com sucesso quando usuário tem permissão e não há filhos", async () => {
		vi.mocked(verificarPermissaoModule.verificarPermissao).mockReturnValue(
			true,
		);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planoContasMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(planoContasRepository.buscarPlanosFilhos).mockResolvedValue([]);
		vi.mocked(planoContasRepository.excluirPlanoContas).mockResolvedValue(
			planoContasMock,
		);

		const resultado = await excluirPlanoContasService({
			idplanocontas: "plano-1",
			idusuario: "usuario-123",
			roles: ["proprietario"],
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(204);
		}
		expect(verificarPermissaoModule.verificarPermissao).toHaveBeenCalledWith(
			["proprietario"],
			["proprietario", "financeiro"],
		);
		expect(planoContasRepository.buscarPlanoContasPorId).toHaveBeenCalledTimes(
			1,
		);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(planoContasRepository.buscarPlanosFilhos).toHaveBeenCalledTimes(1);
		expect(planoContasRepository.excluirPlanoContas).toHaveBeenCalledTimes(1);
	});

	it("deve retornar erro 403 quando usuário não tem permissão", async () => {
		vi.mocked(verificarPermissaoModule.verificarPermissao).mockReturnValue(
			false,
		);

		const resultado = await excluirPlanoContasService({
			idplanocontas: "plano-1",
			idusuario: "usuario-123",
			roles: ["user"],
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
		vi.mocked(verificarPermissaoModule.verificarPermissao).mockReturnValue(
			true,
		);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			undefined,
		);

		const resultado = await excluirPlanoContasService({
			idplanocontas: "plano-inexistente",
			idusuario: "usuario-123",
			roles: ["proprietario"],
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
			expect(resultado.error).toBe("Recurso não encontrado");
			expect(resultado.code).toBe("NOT_FOUND_ERROR");
		}
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).not.toHaveBeenCalled();
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(verificarPermissaoModule.verificarPermissao).mockReturnValue(
			true,
		);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planoContasMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await excluirPlanoContasService({
			idplanocontas: "plano-1",
			idusuario: "usuario-123",
			roles: ["proprietario"],
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(planoContasRepository.buscarPlanosFilhos).not.toHaveBeenCalled();
	});

	it("deve retornar erro 400 quando plano tem filhos", async () => {
		vi.mocked(verificarPermissaoModule.verificarPermissao).mockReturnValue(
			true,
		);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planoContasMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(planoContasRepository.buscarPlanosFilhos).mockResolvedValue([
			planoContasMock,
		]);

		const resultado = await excluirPlanoContasService({
			idplanocontas: "plano-1",
			idusuario: "usuario-123",
			roles: ["proprietario"],
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
			expect(resultado.error).toBe(
				"Não é possível excluir plano de contas que possui filhos",
			);
			expect(resultado.code).toBe("PLANO_CONTAS_COM_FILHOS_ERROR");
		}
		expect(planoContasRepository.excluirPlanoContas).not.toHaveBeenCalled();
	});

	it("deve aceitar role financeiro", async () => {
		vi.mocked(verificarPermissaoModule.verificarPermissao).mockReturnValue(
			true,
		);
		vi.mocked(planoContasRepository.buscarPlanoContasPorId).mockResolvedValue(
			planoContasMock,
		);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(planoContasRepository.buscarPlanosFilhos).mockResolvedValue([]);
		vi.mocked(planoContasRepository.excluirPlanoContas).mockResolvedValue(
			planoContasMock,
		);

		const resultado = await excluirPlanoContasService({
			idplanocontas: "plano-1",
			idusuario: "usuario-123",
			roles: ["financeiro"],
		});

		expect(resultado.success).toBe(true);
		expect(verificarPermissaoModule.verificarPermissao).toHaveBeenCalledWith(
			["financeiro"],
			["proprietario", "financeiro"],
		);
	});
});

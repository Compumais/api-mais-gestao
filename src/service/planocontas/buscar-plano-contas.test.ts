import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as planoContasRepository from "@/repositories/plano-contas-repositories.js";
import { buscarPlanoContasService } from "./buscar-plano-contas.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/plano-contas-repositories.js");

describe("buscarPlanoContasService", () => {
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

	const filhoMock: PlanoContas = {
		id: "plano-filho-1",
		idempresa: "empresa-123",
		codigo: "1.1",
		nome: "Plano Filho 1",
		tipomovimento: "D",
		inativo: 0,
		classe: null,
		currenttimemillis: null,
		centrocustoobrigatorio: null,
		tipoconta: null,
		idcontacontabilintegracao: null,
		exportaparacontabilidade: null,
		idgrupodre: null,
		idplanocontas: "plano-1",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve buscar plano de contas com filhos com sucesso", async () => {
		vi.mocked(
			planoContasRepository.buscarPlanoContasComFilhos,
		).mockResolvedValue({
			plano: planoContasMock,
			filhos: [filhoMock],
		});
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);

		const resultado = await buscarPlanoContasService({
			idplanocontas: "plano-1",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(200);
			expect(resultado.body?.plano).toEqual(planoContasMock);
			expect(resultado.body?.filhos).toEqual([filhoMock]);
		}
		expect(
			planoContasRepository.buscarPlanoContasComFilhos,
		).toHaveBeenCalledTimes(1);
		expect(
			planoContasRepository.buscarPlanoContasComFilhos,
		).toHaveBeenCalledWith("plano-1");
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledWith("usuario-123", "empresa-123");
	});

	it("deve retornar erro 404 quando plano não existe", async () => {
		vi.mocked(
			planoContasRepository.buscarPlanoContasComFilhos,
		).mockResolvedValue({
			plano: undefined,
			filhos: [],
		});

		const resultado = await buscarPlanoContasService({
			idplanocontas: "plano-inexistente",
			idusuario: "usuario-123",
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
		vi.mocked(
			planoContasRepository.buscarPlanoContasComFilhos,
		).mockResolvedValue({
			plano: planoContasMock,
			filhos: [],
		});
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await buscarPlanoContasService({
			idplanocontas: "plano-1",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
			expect(resultado.error).toBe("Acesso proibido");
			expect(resultado.code).toBe("FORBIDDEN_ERROR");
		}
		expect(
			planoContasRepository.buscarPlanoContasComFilhos,
		).toHaveBeenCalledTimes(1);
		expect(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).toHaveBeenCalledTimes(1);
	});

	it("deve retornar plano sem filhos quando não há filhos", async () => {
		vi.mocked(
			planoContasRepository.buscarPlanoContasComFilhos,
		).mockResolvedValue({
			plano: planoContasMock,
			filhos: [],
		});
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);

		const resultado = await buscarPlanoContasService({
			idplanocontas: "plano-1",
			idusuario: "usuario-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.filhos).toHaveLength(0);
		}
	});
});

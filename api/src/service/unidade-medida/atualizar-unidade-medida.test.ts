import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UnidadeMedida } from "@/model/unidade-medida-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as unidadeMedidaRepository from "@/repositories/unidade-medida-repositories.js";
import { atualizarUnidadeMedidaService } from "./atualizar-unidade-medida.js";

vi.mock("@/repositories/unidade-medida-repositories");
vi.mock("@/repositories/entidade-repositories");
vi.mock("@/service/auditoria/criar-auditoria.js", () => ({
	criarAuditoriaService: vi.fn().mockResolvedValue({ success: true }),
}));

describe("atualizarUnidadeMedidaService", () => {
	const unidadeGlobalMock: UnidadeMedida = {
		id: "global-1",
		idempresa: null,
		codigo: "UN",
		nome: "Unidade",
		casasdecimais: 0,
		tipovalor: 0,
		currenttimemillis: 0,
	};

	const unidadeEmpresaMock: UnidadeMedida = {
		id: "empresa-1",
		idempresa: "empresa-123",
		codigo: "CX2",
		nome: "Caixa Especial",
		casasdecimais: 0,
		tipovalor: 0,
		currenttimemillis: 0,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve bloquear atualização de unidade global", async () => {
		vi.mocked(
			unidadeMedidaRepository.buscarUnidadeMedidaPorId,
		).mockResolvedValue(unidadeGlobalMock);

		const resultado = await atualizarUnidadeMedidaService({
			unidadeMedidaId: "global-1",
			idusuario: "usuario-123",
			dados: { nome: "Nova Unidade" },
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
		expect(unidadeMedidaRepository.atualizarUnidadeMedida).not.toHaveBeenCalled();
	});

	it("deve atualizar unidade da empresa quando usuário pertence à empresa", async () => {
		vi.mocked(
			unidadeMedidaRepository.buscarUnidadeMedidaPorId,
		).mockResolvedValue(unidadeEmpresaMock);
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(unidadeMedidaRepository.atualizarUnidadeMedida).mockResolvedValue({
			...unidadeEmpresaMock,
			nome: "Caixa Atualizada",
		});

		const resultado = await atualizarUnidadeMedidaService({
			unidadeMedidaId: "empresa-1",
			idusuario: "usuario-123",
			dados: { nome: "Caixa Atualizada" },
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body?.nome).toBe("Caixa Atualizada");
		}
	});
});

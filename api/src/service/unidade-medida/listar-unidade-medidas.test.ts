import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UnidadeMedida } from "@/model/unidade-medida-model.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as unidadeMedidaRepository from "@/repositories/unidade-medida-repositories.js";
import { listarUnidadeMedidasService } from "./listar-unidade-medidas.js";

vi.mock("@/repositories/unidade-medida-repositories");
vi.mock("@/repositories/entidade-repositories");

describe("listarUnidadeMedidasService", () => {
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

	it("deve listar unidades globais e da empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(unidadeMedidaRepository.listarUnidadesMedida).mockResolvedValue({
			unidadesmedida: [unidadeGlobalMock, unidadeEmpresaMock],
			total: 2,
		});

		const resultado = await listarUnidadeMedidasService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success && resultado.body) {
			expect(resultado.body.data).toHaveLength(2);
			expect(resultado.body.paginacao.total).toBe(2);
		}
	});

	it("deve retornar erro 403 quando usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await listarUnidadeMedidasService({
			idusuario: "usuario-123",
			idempresa: "empresa-123",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
		expect(unidadeMedidaRepository.listarUnidadesMedida).not.toHaveBeenCalled();
	});
});

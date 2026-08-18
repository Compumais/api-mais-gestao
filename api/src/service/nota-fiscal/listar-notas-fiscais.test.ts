import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import { listarNotasFiscaisService } from "./listar-notas-fiscais.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");

describe("listarNotasFiscaisService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(notaRepository.listarNotasFiscaisPorEmpresa).mockResolvedValue({
			notas: [],
			total: 0,
		});
	});

	it("repassa filtro de modelo 55 para a listagem de NF-e de venda", async () => {
		await listarNotasFiscaisService({
			idusuario: "user-1",
			idempresa: "emp-1",
			tipoorigem: 1,
			modelo: "55",
		});

		expect(notaRepository.listarNotasFiscaisPorEmpresa).toHaveBeenCalledWith(
			expect.objectContaining({
				idempresa: "emp-1",
				tipoorigem: 1,
				modelo: "55",
			}),
		);
	});
});

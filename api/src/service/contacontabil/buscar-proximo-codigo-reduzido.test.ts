import { beforeEach, describe, expect, it, vi } from "vitest";
import * as contaContabilRepository from "@/repositories/conta-contabil-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { buscarProximoCodigoReduzidoService } from "./buscar-proximo-codigo-reduzido.js";

vi.mock("@/repositories/conta-contabil-repositories");
vi.mock("@/repositories/entidade-repositories");

describe("buscarProximoCodigoReduzidoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna o próximo código reduzido da empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaContabilRepository.buscarProximoCodigoReduzidoContaContabil,
		).mockResolvedValue("15");

		const resultado = await buscarProximoCodigoReduzidoService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.body).toEqual({ codigo: "15" });
		}
	});

	it("nega acesso quando o usuário não pertence à empresa", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);

		const resultado = await buscarProximoCodigoReduzidoService({
			idusuario: "usuario-1",
			idempresa: "empresa-1",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(403);
		}
		expect(
			contaContabilRepository.buscarProximoCodigoReduzidoContaContabil,
		).not.toHaveBeenCalled();
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContaContabil } from "@/model/conta-contabil-model.js";
import * as contaContabilRepository from "@/repositories/conta-contabil-repositories.js";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import { atualizarContaContabilService } from "./atualizar-conta-contabil.js";

vi.mock("@/repositories/conta-contabil-repositories");
vi.mock("@/repositories/entidade-repositories");

function criarConta(parcial: Partial<ContaContabil> = {}): ContaContabil {
	return {
		id: "conta-1",
		idcontapai: null,
		idempresa: "empresa-1",
		inativo: 0,
		descricao: "Fornecedores",
		codigocontareferencial: null,
		codigoextenso: "2.1.01",
		codigoreduzido: "10",
		contaglutinadora: null,
		currenttimemillis: 1,
		datacadastro: "2026-01-01",
		dataultimaalteracao: "2026-01-01",
		idultimousuarioalteracao: "usuario-1",
		idusuariocadastro: "usuario-1",
		natureza: "C",
		nivelconta: 3,
		numeronivel1: null,
		numeronivel2: null,
		numeronivel3: null,
		numeronivel4: null,
		numeronivel5: null,
		numeronivel6: null,
		numeronivel7: null,
		numeronivel8: null,
		numeronivel9: null,
		tipocontacontabil: "A",
		...parcial,
	};
}

describe("atualizarContaContabilService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejeita código reduzido já usado por outra conta da empresa", async () => {
		vi.mocked(
			contaContabilRepository.buscarContaContabilPorId,
		).mockResolvedValue(criarConta());
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaContabilRepository.buscarContaContabilPorCodigoReduzido,
		).mockResolvedValue(criarConta({ id: "conta-2", codigoreduzido: "99" }));

		const resultado = await atualizarContaContabilService({
			id: "conta-1",
			idusuario: "usuario-1",
			dados: { codigoreduzido: "99" },
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
		}
		expect(
			contaContabilRepository.atualizarContaContabil,
		).not.toHaveBeenCalled();
	});

	it("atualiza o código reduzido quando está livre", async () => {
		const atualizada = criarConta({ codigoreduzido: "20" });
		vi.mocked(
			contaContabilRepository.buscarContaContabilPorId,
		).mockResolvedValue(criarConta());
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(
			contaContabilRepository.buscarContaContabilPorCodigoReduzido,
		).mockResolvedValue(undefined);
		vi.mocked(contaContabilRepository.atualizarContaContabil).mockResolvedValue(
			atualizada,
		);

		const resultado = await atualizarContaContabilService({
			id: "conta-1",
			idusuario: "usuario-1",
			dados: { codigoreduzido: " 20 " },
		});

		expect(resultado.success).toBe(true);
		expect(contaContabilRepository.atualizarContaContabil).toHaveBeenCalledWith(
			"conta-1",
			expect.objectContaining({ codigoreduzido: "20" }),
		);
	});

	it("permite limpar o código reduzido", async () => {
		const atualizada = criarConta({ codigoreduzido: null });
		vi.mocked(
			contaContabilRepository.buscarContaContabilPorId,
		).mockResolvedValue(criarConta());
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(contaContabilRepository.atualizarContaContabil).mockResolvedValue(
			atualizada,
		);

		const resultado = await atualizarContaContabilService({
			id: "conta-1",
			idusuario: "usuario-1",
			dados: { codigoreduzido: "" },
		});

		expect(resultado.success).toBe(true);
		expect(
			contaContabilRepository.buscarContaContabilPorCodigoReduzido,
		).not.toHaveBeenCalled();
		expect(contaContabilRepository.atualizarContaContabil).toHaveBeenCalledWith(
			"conta-1",
			expect.objectContaining({ codigoreduzido: null }),
		);
	});
});

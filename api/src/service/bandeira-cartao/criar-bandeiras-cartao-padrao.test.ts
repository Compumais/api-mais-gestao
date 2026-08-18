import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BandeiraCartao } from "@/model/bandeira-cartao-model.js";
import * as bandeiraCartaoRepository from "@/repositories/bandeira-cartao-repositories.js";
import { criarBandeirasCartaoPadraoService } from "./criar-bandeiras-cartao-padrao.js";

vi.mock("@/repositories/bandeira-cartao-repositories");

describe("criarBandeirasCartaoPadraoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("não cria duplicatas quando a empresa já tem bandeiras", async () => {
		vi.mocked(
			bandeiraCartaoRepository.verificarEmpresaPossuiBandeirasCartao,
		).mockResolvedValue(true);

		const resultado = await criarBandeirasCartaoPadraoService("empresa-123");

		expect(resultado).toEqual([]);
		expect(
			bandeiraCartaoRepository.criarBandeirasCartaoEmLote,
		).not.toHaveBeenCalled();
	});

	it("cria as bandeiras padrão quando a empresa ainda não tem cadastro", async () => {
		vi.mocked(
			bandeiraCartaoRepository.verificarEmpresaPossuiBandeirasCartao,
		).mockResolvedValue(false);
		vi.mocked(
			bandeiraCartaoRepository.criarBandeirasCartaoEmLote,
		).mockImplementation(async (registros) => {
			expect(registros.length).toBeGreaterThan(0);
			return registros as BandeiraCartao[];
		});

		const resultado = await criarBandeirasCartaoPadraoService("empresa-123");

		expect(resultado.length).toBeGreaterThan(0);
		expect(resultado[0]?.idempresa).toBe("empresa-123");
	});
});

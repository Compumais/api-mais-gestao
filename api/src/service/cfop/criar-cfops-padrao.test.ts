import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cfopRepository from "@/repositories/cfop-repositories.js";
import * as cfopPadraoUtil from "@/util/cfop-padrao.js";
import { criarCfopsPadraoService } from "./criar-cfops-padrao.js";

vi.mock("@/repositories/cfop-repositories.js");
vi.mock("@/util/cfop-padrao.js");

describe("criarCfopsPadraoService", () => {
	const idempresa = "empresa-teste-123";
	const cfopsMontados = [
		{
			id: "cfop-1",
			idempresa,
			codigo: "1101",
			descricao: "Compra para industrialização",
			currenttimemillis: 1,
		},
	] as never;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(cfopPadraoUtil.montarCfopsPadrao).mockReturnValue(cfopsMontados);
	});

	it("não deve inserir CFOPs quando a empresa já possui registros", async () => {
		vi.mocked(cfopRepository.verificarEmpresaPossuiCfops).mockResolvedValue(
			true,
		);

		const resultado = await criarCfopsPadraoService(idempresa);

		expect(resultado).toEqual([]);
		expect(cfopRepository.criarCfopsEmLote).not.toHaveBeenCalled();
	});

	it("deve inserir os CFOPs padrão quando a empresa não possui registros", async () => {
		vi.mocked(cfopRepository.verificarEmpresaPossuiCfops).mockResolvedValue(
			false,
		);
		vi.mocked(cfopRepository.criarCfopsEmLote).mockResolvedValue(
			cfopsMontados,
		);

		const resultado = await criarCfopsPadraoService(idempresa);

		expect(cfopPadraoUtil.montarCfopsPadrao).toHaveBeenCalledWith(idempresa);
		expect(cfopRepository.criarCfopsEmLote).toHaveBeenCalledWith(cfopsMontados);
		expect(resultado).toEqual(cfopsMontados);
	});

	it("deve lançar erro quando a inserção não retornar todos os registros", async () => {
		vi.mocked(cfopRepository.verificarEmpresaPossuiCfops).mockResolvedValue(
			false,
		);
		vi.mocked(cfopRepository.criarCfopsEmLote).mockResolvedValue([] as never);

		await expect(criarCfopsPadraoService(idempresa)).rejects.toThrow(
			"Erro ao criar CFOPs padrão da empresa",
		);
	});
});

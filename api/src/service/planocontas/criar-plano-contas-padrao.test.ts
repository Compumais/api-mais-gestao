import { beforeEach, describe, expect, it, vi } from "vitest";
import * as planoContasRepository from "@/repositories/plano-contas-repositories.js";
import * as planoContasPadraoUtil from "@/util/plano-contas-padrao.js";
import { criarPlanoContasPadraoService } from "./criar-plano-contas-padrao.js";

vi.mock("@/repositories/plano-contas-repositories.js");
vi.mock("@/util/plano-contas-padrao.js");

describe("criarPlanoContasPadraoService", () => {
	const idempresa = "empresa-teste-123";
	const planosMontados = [
		{
			id: "plano-1",
			idempresa,
			codigo: "1",
			nome: "Receitas",
			tipomovimento: "E",
			inativo: 0,
			classe: "01",
			currenttimemillis: 1,
			centrocustoobrigatorio: 0,
			tipoconta: 1,
			exportaparacontabilidade: 1,
		},
	] as never;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(planoContasPadraoUtil.montarPlanoContasPadrao).mockReturnValue(
			planosMontados,
		);
	});

	it("não deve inserir plano quando a empresa já possui contas", async () => {
		vi.mocked(
			planoContasRepository.verificarEmpresaPossuiPlanoContas,
		).mockResolvedValue(true);

		const resultado = await criarPlanoContasPadraoService(idempresa);

		expect(resultado).toEqual([]);
		expect(planoContasRepository.criarPlanoContasEmLote).not.toHaveBeenCalled();
	});

	it("deve inserir o plano padrão quando a empresa não possui contas", async () => {
		vi.mocked(
			planoContasRepository.verificarEmpresaPossuiPlanoContas,
		).mockResolvedValue(false);
		vi.mocked(planoContasRepository.criarPlanoContasEmLote).mockResolvedValue(
			planosMontados,
		);

		const resultado = await criarPlanoContasPadraoService(idempresa);

		expect(planoContasPadraoUtil.montarPlanoContasPadrao).toHaveBeenCalledWith(
			idempresa,
		);
		expect(planoContasRepository.criarPlanoContasEmLote).toHaveBeenCalledWith(
			planosMontados,
		);
		expect(resultado).toEqual(planosMontados);
	});

	it("deve lançar erro quando a inserção não retornar todos os registros", async () => {
		vi.mocked(
			planoContasRepository.verificarEmpresaPossuiPlanoContas,
		).mockResolvedValue(false);
		vi.mocked(planoContasRepository.criarPlanoContasEmLote).mockResolvedValue(
			[] as never,
		);

		await expect(criarPlanoContasPadraoService(idempresa)).rejects.toThrow(
			"Erro ao criar plano de contas padrão da empresa",
		);
	});
});

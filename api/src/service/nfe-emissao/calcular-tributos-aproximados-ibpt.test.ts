import { beforeEach, describe, expect, it, vi } from "vitest";

const { buscarUltimaImportacaoIbptPorUf, buscarIbptAliquotasPorNcms } =
	vi.hoisted(() => ({
		buscarUltimaImportacaoIbptPorUf: vi.fn(),
		buscarIbptAliquotasPorNcms: vi.fn(),
	}));

vi.mock("@/repositories/ibpt-repositories.js", () => ({
	buscarUltimaImportacaoIbptPorUf,
	buscarIbptAliquotasPorNcms,
}));

import { calcularTributosAproximadosIbpt } from "./calcular-tributos-aproximados-ibpt.js";

const item = {
	descricao: "PÃO FRANCÊS",
	ncm: "19059090",
	cfop: "5102",
	unidade: "UN",
	quantidade: 1,
	valorUnitario: 10,
};

describe("calcularTributosAproximadosIbpt", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("não interrompe a emissão quando as tabelas IBPT ainda não existem", async () => {
		const erro = Object.assign(
			new Error('relation "ibpt_importacao" does not exist'),
			{ code: "42P01" },
		);
		buscarUltimaImportacaoIbptPorUf.mockRejectedValue(erro);

		const resultado = await calcularTributosAproximadosIbpt({
			uf: "MG",
			itens: [item],
		});

		expect(resultado.itens).toEqual([item]);
		expect(resultado.totalAproximado).toBe(0);
		expect(resultado.pendencias[0]).toContain("ainda não instalada");
	});

	it("continua sem tributos quando a tabela da UF ainda não foi importada", async () => {
		buscarUltimaImportacaoIbptPorUf.mockResolvedValue(undefined);

		const resultado = await calcularTributosAproximadosIbpt({
			uf: "MG",
			itens: [item],
		});

		expect(resultado.totalAproximado).toBe(0);
		expect(resultado.pendencias[0]).toContain("não importada");
	});
});

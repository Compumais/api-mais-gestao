import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	baixarTabelaIbptPorUf,
	registrarImportacaoIbpt,
	substituirAliquotasIbptPorUf,
} = vi.hoisted(() => ({
	baixarTabelaIbptPorUf: vi.fn(),
	registrarImportacaoIbpt: vi.fn(),
	substituirAliquotasIbptPorUf: vi.fn(),
}));

vi.mock("@/lib/ibpt-client.js", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@/lib/ibpt-client.js")>();
	return { ...original, baixarTabelaIbptPorUf };
});

vi.mock("@/repositories/ibpt-repositories.js", () => ({
	contarAliquotasIbptPorUf: vi.fn(),
	buscarUltimaImportacaoIbptPorUf: vi.fn(),
	registrarImportacaoIbpt,
	substituirAliquotasIbptPorUf,
}));

import { IbptApiError } from "@/lib/ibpt-client.js";
import { importarTabelaIbptService } from "./importar-tabela-ibpt.js";

describe("importarTabelaIbptService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sincroniza o contrato da API externa preservando o armazenamento atual", async () => {
		baixarTabelaIbptPorUf.mockResolvedValue({
			versao: "26.2.A",
			uf: "MG",
			total: 1,
			ncm: [
				{
					codigo: "19059090",
					nacionalfederal: "13.45",
					importadosfederal: "15.45",
					estadual: "18.00",
					municipal: "0.00",
					vigenciainicio: "2026-08-20",
					vigenciafim: "2026-09-30",
					versao: "26.2.A",
					fonte: "IBPT/empresometro.com.br",
					uf: "MG",
				},
			],
		});

		const resultado = await importarTabelaIbptService({
			uf: "mg",
			idusuario: "usuario-1",
		});

		expect(resultado.success).toBe(true);
		expect(resultado.body).toMatchObject({
			uf: "MG",
			chave: "26.2.A",
			versao: "26.2.A",
			quantidadeRegistros: 1,
		});
		expect(substituirAliquotasIbptPorUf).toHaveBeenCalledWith(
			"MG",
			expect.arrayContaining([
				expect.objectContaining({
					ncm: "19059090",
					aliquotaNacional: "13.45",
				}),
			]),
		);
		expect(registrarImportacaoIbpt).toHaveBeenCalledWith(
			expect.objectContaining({ chave: "26.2.A", idusuario: "usuario-1" }),
		);
	});

	it("retorna bad gateway quando a API externa falha", async () => {
		baixarTabelaIbptPorUf.mockRejectedValue(
			new IbptApiError("API IBPT retornou status 503"),
		);

		const resultado = await importarTabelaIbptService({ uf: "SP" });

		expect(resultado).toMatchObject({
			success: false,
			status: 502,
			code: "BAD_GATEWAY_ERROR",
		});
		expect(substituirAliquotasIbptPorUf).not.toHaveBeenCalled();
	});
});

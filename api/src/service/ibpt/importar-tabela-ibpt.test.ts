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

	it("envia um único NCM quando a API traz mercadoria e serviço com o mesmo código", async () => {
		baixarTabelaIbptPorUf.mockResolvedValue({
			versao: "26.2.A",
			uf: "MG",
			total: 2,
			ncm: [
				{
					codigo: "11090000",
					nacionalfederal: "13.45",
					importadosfederal: "15.45",
					estadual: "18",
					municipal: "0",
					chave: "26.2.A",
				},
				{
					codigo: "11090000",
					nacionalfederal: "13.45",
					importadosfederal: "15.45",
					estadual: "0",
					municipal: "5",
					chave: "26.2.A",
				},
			],
		});

		const resultado = await importarTabelaIbptService({ uf: "MG" });

		expect(resultado.success).toBe(true);
		expect(resultado.body).toMatchObject({ quantidadeRegistros: 1 });
		expect(substituirAliquotasIbptPorUf).toHaveBeenCalledWith(
			"MG",
			expect.arrayContaining([
				expect.objectContaining({
					ncm: "11090000",
					aliquotaEstadual: "18",
					aliquotaMunicipal: "0",
				}),
			]),
		);
		expect(substituirAliquotasIbptPorUf.mock.calls[0]?.[1]).toHaveLength(1);
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

	it("não devolve o SQL cru quando a gravação da tabela falha", async () => {
		baixarTabelaIbptPorUf.mockResolvedValue({
			versao: "26.2.A",
			uf: "MG",
			total: 1,
			ncm: [
				{
					codigo: "19059090",
					nacionalfederal: "13.45",
					chave: "26.2.A",
				},
			],
		});
		substituirAliquotasIbptPorUf.mockRejectedValue(
			new Error("Failed query: insert into \"ibpt_aliquota\" values ($1)"),
		);

		const resultado = await importarTabelaIbptService({ uf: "MG" });

		expect(resultado).toMatchObject({
			success: false,
			status: 400,
			code: "BAD_REQUEST_ERROR",
			error: "Falha ao gravar a tabela IBPT no banco. Tente sincronizar novamente.",
		});
	});
});

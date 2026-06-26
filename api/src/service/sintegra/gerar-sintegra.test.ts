import { beforeEach, describe, expect, it, vi } from "vitest";
import { gerarArquivoSintegra } from "./gerar-sintegra.js";

vi.mock("@/repositories/sintegra-repositories.js", () => ({
	buscarDadosContribuinteSintegra: vi.fn(),
	listarNotasSintegra: vi.fn(),
	listarItensNotasSintegra: vi.fn(),
	listarInventarioFiscalSintegra: vi.fn(),
	listarResumoNfceDiarioSintegra: vi.fn(),
	listarProdutosSintegra: vi.fn(),
	agruparItensRegistro50: vi.fn(),
	somarIpiPorNota: vi.fn(),
}));

import {
	agruparItensRegistro50,
	buscarDadosContribuinteSintegra,
	listarInventarioFiscalSintegra,
	listarItensNotasSintegra,
	listarNotasSintegra,
	listarProdutosSintegra,
	listarResumoNfceDiarioSintegra,
	somarIpiPorNota,
} from "@/repositories/sintegra-repositories.js";

describe("gerarArquivoSintegra", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve gerar arquivo com registros 10, 11 e 90", async () => {
		vi.mocked(buscarDadosContribuinteSintegra).mockResolvedValue({
			cnpj: "12345678000190",
			inscricaoEstadual: "1234567890",
			razaosocial: "EMPRESA TESTE LTDA",
			municipio: "BELO HORIZONTE",
			uf: "MG",
			fax: "",
			logradouro: "RUA TESTE",
			numero: "100",
			complemento: "",
			bairro: "CENTRO",
			cep: "30100000",
			contato: "CONTATO",
			telefone: "31999999999",
			crt: 3,
			codigoMunicipioIbge: "3106200",
		});
		vi.mocked(listarNotasSintegra).mockResolvedValue([]);
		vi.mocked(listarItensNotasSintegra).mockResolvedValue([]);
		vi.mocked(listarInventarioFiscalSintegra).mockResolvedValue([]);
		vi.mocked(listarResumoNfceDiarioSintegra).mockResolvedValue([]);
		vi.mocked(listarProdutosSintegra).mockResolvedValue([]);
		vi.mocked(agruparItensRegistro50).mockReturnValue([]);
		vi.mocked(somarIpiPorNota).mockReturnValue(new Map());

		const resultado = await gerarArquivoSintegra({
			idempresa: "00000000-0000-0000-0000-000000000001",
			dataInicio: "2025-06-01",
			dataFim: "2025-06-30",
		});

		expect(resultado.conteudo).toContain("10");
		expect(resultado.conteudo).toContain("11");
		expect(resultado.conteudo).toContain("90");
		expect(resultado.filename).toContain("sintegra-");
	});
});

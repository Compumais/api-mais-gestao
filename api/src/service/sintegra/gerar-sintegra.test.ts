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

	it("inclui compra no mês da entrada e imprime essa data no registro 50", async () => {
		const notaEntrada = {
			id: "nota-entrada-1",
			emissao: "2025-06-15",
			dataCompetencia: "2025-07-10",
			modelo: "55",
			serie: "1",
			numero: "88",
			numeronotafiscal: "88",
			cnpjCpf: "12345678000190",
			inscricaoEstadual: "1234567890",
			uf: "MG",
			cfopCodigo: "1102",
			valorTotal: "100.00",
			baseIcms: "100.00",
			valorIcms: "12.00",
			valorIpi: "0",
			baseIcmsSt: "0",
			valorIcmsSt: "0",
			emitente: "T" as const,
			situacao: "N" as const,
			tipoorigem: 0,
			cancelada: false,
		};

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
		vi.mocked(listarNotasSintegra).mockResolvedValue([notaEntrada]);
		vi.mocked(listarItensNotasSintegra).mockResolvedValue([]);
		vi.mocked(listarInventarioFiscalSintegra).mockResolvedValue([]);
		vi.mocked(listarResumoNfceDiarioSintegra).mockResolvedValue([]);
		vi.mocked(listarProdutosSintegra).mockResolvedValue([]);
		vi.mocked(agruparItensRegistro50).mockReturnValue([
			{
				nota: notaEntrada,
				cfop: "1102",
				aliquota: "12.00",
				valorTotal: 100,
				baseIcms: 100,
				valorIcms: 12,
				valorIsento: 0,
				valorOutras: 0,
			},
		]);
		vi.mocked(somarIpiPorNota).mockReturnValue(new Map());

		const resultado = await gerarArquivoSintegra({
			idempresa: "00000000-0000-0000-0000-000000000001",
			dataInicio: "2025-07-01",
			dataFim: "2025-07-31",
		});

		expect(resultado.conteudo).toContain("20250710");
		expect(resultado.conteudo).not.toContain("20250615");
	});

	it("gera registro 53 por CFOP do registro 50 quando há ST no cabeçalho", async () => {
		const notaEntrada = {
			id: "nota-st-1",
			emissao: "2026-09-28",
			dataCompetencia: "2026-09-28",
			modelo: "55",
			serie: "1",
			numero: "363146",
			numeronotafiscal: "363146",
			cnpjCpf: "77595395004800",
			inscricaoEstadual: "023219980058",
			uf: "MG",
			cfopCodigo: "1101",
			valorTotal: "5440.00",
			baseIcms: "0",
			valorIcms: "0",
			valorIpi: "0",
			baseIcmsSt: "2058.60",
			valorIcmsSt: "96.00",
			emitente: "T" as const,
			situacao: "N" as const,
			tipoorigem: 0,
			cancelada: false,
		};

		vi.mocked(buscarDadosContribuinteSintegra).mockResolvedValue({
			cnpj: "56259933000152",
			inscricaoEstadual: "0049598610020",
			razaosocial: "VINICIUS EDUARDO DA COSTA LTDA",
			municipio: "SACRAMENTO",
			uf: "MG",
			fax: "",
			logradouro: "PRACA ZELIA JERONIMO",
			numero: "111",
			complemento: "",
			bairro: "MARIA ROSA",
			cep: "38190000",
			contato: "PASTELARIA",
			telefone: "3484033490",
			crt: 3,
			codigoMunicipioIbge: "3156909",
		});
		vi.mocked(listarNotasSintegra).mockResolvedValue([notaEntrada]);
		vi.mocked(listarItensNotasSintegra).mockResolvedValue([]);
		vi.mocked(listarInventarioFiscalSintegra).mockResolvedValue([]);
		vi.mocked(listarResumoNfceDiarioSintegra).mockResolvedValue([]);
		vi.mocked(listarProdutosSintegra).mockResolvedValue([]);
		vi.mocked(agruparItensRegistro50).mockReturnValue([
			{
				nota: notaEntrada,
				cfop: "1401",
				aliquota: "18.00",
				valorTotal: 2287.2,
				baseIcms: 152.49,
				valorIcms: 27.45,
				valorIsento: 0,
				valorOutras: 0,
			},
			{
				nota: notaEntrada,
				cfop: "1102",
				aliquota: "0",
				valorTotal: 3158.0,
				baseIcms: 0,
				valorIcms: 0,
				valorIsento: 0,
				valorOutras: 3158.0,
			},
		]);
		vi.mocked(somarIpiPorNota).mockReturnValue(new Map());

		const resultado = await gerarArquivoSintegra({
			idempresa: "00000000-0000-0000-0000-000000000001",
			dataInicio: "2026-09-01",
			dataFim: "2026-09-30",
		});

		const linhas53 = resultado.conteudo
			.split(/\r?\n/)
			.filter((linha) => linha.startsWith("53"));
		expect(linhas53).toHaveLength(2);
		expect(linhas53.some((linha) => linha.includes("1401"))).toBe(true);
		expect(linhas53.some((linha) => linha.includes("1102"))).toBe(true);
		expect(linhas53.some((linha) => linha.includes("1101"))).toBe(false);
	});
});

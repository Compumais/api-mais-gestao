import { beforeEach, describe, expect, it, vi } from "vitest";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import { gerarRelatorioFiscalCompras } from "./fiscal-compras.service.js";

vi.mock("@/repositories/empresa-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");

describe("gerarRelatorioFiscalCompras", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("anexa os produtos abaixo de cada documento no TXT", async () => {
		vi.mocked(empresaRepository.buscarEmpresaPorId).mockResolvedValue({
			id: "emp-1",
			nome: "PASTELARIA",
			cnpj: "12345678000190",
		} as Awaited<ReturnType<typeof empresaRepository.buscarEmpresaPorId>>);
		vi.mocked(
			notaRepository.listarNotasRelatorioFiscalCompras,
		).mockResolvedValue([
			{
				id: "n1",
				emissao: "2026-09-10",
				numero: "207713",
				numeronotafiscal: "207713",
				chavenfe: null,
				modelo: "55",
				tipoorigem: 0,
				valortotalnota: "132.60",
				baseicms: "0",
				icms: "0",
				pis: "0",
				cofins: "0",
				status: 100,
				parceiroNome: "UBER SUCOS",
				cfopCodigo: "1403",
				cfopDescricao: "Compra",
			},
		]);
		vi.mocked(notaRepository.listarItensRelatorioFiscal).mockResolvedValue([
			{
				id: "p1",
				idnotafiscal: "n1",
				codigo: "10",
				descricao: "SUCO LARANJA 1L",
				quantidade: "10",
				unidade: "UN",
				precounitario: "13.26",
				total: "132.60",
				cfop: "1403",
				baseicms: "0",
				icms: "0",
			},
		]);

		const resultado = await gerarRelatorioFiscalCompras({
			idempresa: "emp-1",
			dataInicio: "2026-09-01",
			dataFim: "2026-09-30",
			formato: "txt",
		});

		expect(notaRepository.listarItensRelatorioFiscal).toHaveBeenCalledWith([
			"n1",
		]);
		expect(String(resultado.content)).toContain("Número: 207713");
		expect(String(resultado.content)).toContain("SUCO LARANJA 1L");
	});
});

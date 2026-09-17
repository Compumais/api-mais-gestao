import { beforeEach, describe, expect, it, vi } from "vitest";
import * as empresaRepository from "@/repositories/empresa-repositories.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import { gerarRelatorioFiscalVendas } from "./fiscal-vendas.service.js";

vi.mock("@/repositories/empresa-repositories.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");

describe("gerarRelatorioFiscalVendas", () => {
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
			notaRepository.listarNotasRelatorioFiscalVendas,
		).mockResolvedValue([
			{
				id: "n1",
				emissao: "2026-09-10",
				numero: "100",
				numeronotafiscal: "100",
				chavenfe: "3512",
				modelo: "65",
				tipoorigem: 1,
				valortotalnota: "50.00",
				baseicms: "0",
				icms: "0",
				pis: "0",
				cofins: "0",
				status: 100,
				parceiroNome: "CONSUMIDOR",
				cfopCodigo: "5102",
				cfopDescricao: "Venda",
			},
		]);
		vi.mocked(notaRepository.listarItensRelatorioFiscal).mockResolvedValue([
			{
				id: "p1",
				idnotafiscal: "n1",
				codigo: "99",
				descricao: "PASTEL DE CARNE",
				quantidade: "2",
				unidade: "UN",
				precounitario: "25.00",
				total: "50.00",
				cfop: "5102",
				baseicms: "0",
				icms: "0",
			},
		]);

		const resultado = await gerarRelatorioFiscalVendas({
			idempresa: "emp-1",
			dataInicio: "2026-09-01",
			dataFim: "2026-09-30",
			formato: "txt",
		});

		expect(notaRepository.listarItensRelatorioFiscal).toHaveBeenCalledWith([
			"n1",
		]);
		expect(String(resultado.content)).toContain("Número: 100");
		expect(String(resultado.content)).toContain("PASTEL DE CARNE");
	});
});

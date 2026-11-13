import { beforeEach, describe, expect, it, vi } from "vitest";
import * as relatoriosRepository from "@/repositories/relatorios-repositories.js";
import { gerarRelatorioDespesasPorCategoria } from "./despesas-por-categoria.service.js";

vi.mock("@/repositories/relatorios-repositories.js");

describe("gerarRelatorioDespesasPorCategoria", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("chama o repositório com o idempresa correto e formata o TXT", async () => {
		vi.mocked(relatoriosRepository.buscarDespesasPorCategoria).mockResolvedValue([
			{
				codigo: "1.01",
				nome: "Material de Escritório",
				total: 150.5,
			},
			{
				codigo: "SEM-COD",
				nome: "Não categorizado",
				total: 50.0,
			},
		]);

		const resultado = await gerarRelatorioDespesasPorCategoria({
			idempresa: "empresa-123",
			dataInicio: "2026-01-01",
			dataFim: "2026-01-31",
			formato: "txt",
		});

		expect(relatoriosRepository.buscarDespesasPorCategoria).toHaveBeenCalledWith({
			idempresa: "empresa-123",
			dataInicio: "2026-01-01",
			dataFim: "2026-01-31",
		});

		expect(resultado.contentType).toBe("text/plain; charset=utf-8");
		expect(resultado.content).toContain("RELATORIO DE DESPESAS POR CATEGORIA");
		expect(resultado.content).toContain("Material de Escritório");
		expect(resultado.content).toContain("Não categorizado");
		expect(resultado.content).toContain("TOTAL GERAL");
	});

	it("gera relatório em formato HTML corretamente", async () => {
		vi.mocked(relatoriosRepository.buscarDespesasPorCategoria).mockResolvedValue([
			{
				codigo: "2.01",
				nome: "Energia Elétrica",
				total: 350.0,
			},
		]);

		const resultado = await gerarRelatorioDespesasPorCategoria({
			idempresa: "empresa-123",
			dataInicio: "2026-01-01",
			dataFim: "2026-01-31",
			formato: "html",
		});

		expect(resultado.contentType).toBe("text/html; charset=utf-8");
		expect(resultado.content).toContain("<h1>Relatório de Despesas por Categoria</h1>");
		expect(resultado.content).toContain("Energia Elétrica");
	});
});

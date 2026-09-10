import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepository from "@/repositories/entidade-repositories.js";
import * as relatorioRepository from "@/repositories/relatorio-produtos-repositories.js";
import {
	type ErroRelatorioProdutos,
	gerarRelatorioProdutos,
	validarGtin,
} from "./relatorio-produtos.service.js";

vi.mock("@/repositories/entidade-repositories.js", () => ({
	verificarUsuarioPertenceEmpresa: vi.fn(),
}));
vi.mock("@/repositories/relatorio-produtos-repositories.js", () => ({
	consultarRelatorioProdutos: vi.fn(),
	consultarResumoQualidadeProdutos: vi.fn(),
	consultarDisponibilidadePrecosProdutos: vi.fn(),
}));
vi.mock("@/repositories/empresa-repositories.js", () => ({
	buscarEmpresaPorId: vi.fn(),
}));

const filtros = {
	idempresa: "11111111-1111-4111-8111-111111111111",
	page: 1,
	limit: 20,
	ordem: "asc" as const,
};

describe("validarGtin", () => {
	it.each([
		"7894900011517",
		"7891000315507",
		"96385074",
	])("aceita GTIN válido %s", (valor) => expect(validarGtin(valor)).toBe(true));

	it.each([
		"7894900011518",
		"123",
		"ABC789",
	])("rejeita GTIN inválido %s", (valor) =>
		expect(validarGtin(valor)).toBe(false));
});

describe("gerarRelatorioProdutos", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(relatorioRepository.consultarRelatorioProdutos).mockResolvedValue(
			{
				linhas: [{ codigo: 1, nome: "Produto" }],
				total: 21,
			},
		);
	});

	it("monta contrato paginado com repository mockado", async () => {
		const resultado = await gerarRelatorioProdutos({
			tipo: "cadastro",
			filtros,
			idusuario: "usuario-1",
		});

		expect(resultado.tipo).toBe("cadastro");
		expect(resultado.data).toHaveLength(1);
		expect(resultado.paginacao).toEqual({
			page: 1,
			limit: 20,
			total: 21,
			totalPages: 2,
		});
		expect(relatorioRepository.consultarRelatorioProdutos).toHaveBeenCalledWith(
			"cadastro",
			filtros,
		);
	});

	it("bloqueia acesso a empresa de outro usuário", async () => {
		vi.mocked(
			entidadeRepository.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(false);
		await expect(
			gerarRelatorioProdutos({
				tipo: "cadastro",
				filtros,
				idusuario: "usuario-1",
			}),
		).rejects.toEqual(
			expect.objectContaining<Partial<ErroRelatorioProdutos>>({ status: 403 }),
		);
	});

	it("rejeita filtro não permitido pelo tipo", async () => {
		await expect(
			gerarRelatorioProdutos({
				tipo: "auditoria",
				filtros: { ...filtros, margemMin: 10 },
				idusuario: "usuario-1",
			}),
		).rejects.toThrow('O filtro "margemMin" não é aceito');
	});

	it("aceita filtros seguros de origem e tipo de estoque em movimentações", async () => {
		await gerarRelatorioProdutos({
			tipo: "movimentacoes",
			filtros: {
				...filtros,
				origem: "nota_fiscal",
				tipoEstoque: "fiscal",
			},
			idusuario: "usuario-1",
		});

		expect(relatorioRepository.consultarRelatorioProdutos).toHaveBeenCalledWith(
			"movimentacoes",
			expect.objectContaining({
				origem: "nota_fiscal",
				tipoEstoque: "fiscal",
			}),
		);
	});

	it("avisa quando não há tabela ou promoção cadastrada", async () => {
		vi.mocked(
			relatorioRepository.consultarDisponibilidadePrecosProdutos,
		).mockResolvedValue({ tabelas: 0, promocoes: 0 });

		const resultado = await gerarRelatorioProdutos({
			tipo: "precos",
			filtros,
			idusuario: "usuario-1",
		});

		expect(resultado.avisos).toEqual(
			expect.arrayContaining([
				expect.stringContaining("Não há itens de tabela"),
				expect.stringContaining("Não há preços promocionais"),
			]),
		);
	});
});

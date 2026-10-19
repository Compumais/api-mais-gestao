import { beforeEach, describe, expect, it, vi } from "vitest";
import * as movimentoEstoqueRepository from "@/repositories/movimento-estoque-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import * as registrarMovimento from "@/service/estoque/registrar-movimento-estoque.js";
import { registrarMovimentosEstoqueNf } from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";
import { TIPO_ESTOQUE } from "@/util/tipo-estoque.js";

vi.mock("@/repositories/configuracao-pdv-repositories.js", () => ({
	buscarConfiguracaoPdvPorEmpresa: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/repositories/movimento-estoque-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/service/estoque/registrar-movimento-estoque.js");

describe("registrarMovimentosEstoqueNf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			movimentoEstoqueRepository.listarMovimentosEstoquePorDocumento,
		).mockResolvedValue([]);
		vi.mocked(registrarMovimento.registrarMovimentoEstoque).mockResolvedValue({
			id: 1,
		} as never);
	});

	it("entrada de NF registra estoque AMBOS", async () => {
		const resultado = await registrarMovimentosEstoqueNf({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			idlocalestoque: "local-1",
			dataMovimento: "2026-06-24",
			sentido: "entrada",
			itens: [
				{
					iditem: "item-1",
					idproduto: "prod-1",
					quantidade: "4",
					custoUnitario: "10",
				},
			],
		});

		expect(resultado.movimentosCriados).toBe(1);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				sentido: "entrada",
				tipoestoque: TIPO_ESTOQUE.AMBOS,
				quantidade: "4.000000",
			}),
		);
	});

	it("saída de NF-e venda registra estoque AMBOS", async () => {
		const resultado = await registrarMovimentosEstoqueNf({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			idlocalestoque: "local-1",
			dataMovimento: "2026-06-24",
			sentido: "saida",
			itens: [
				{
					iditem: "item-1",
					idproduto: "prod-1",
					quantidade: "2",
					custoUnitario: "10",
				},
			],
		});

		expect(resultado.movimentosCriados).toBe(1);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				sentido: "saida",
				tipoestoque: TIPO_ESTOQUE.AMBOS,
				quantidade: "2.000000",
			}),
		);
	});

	it("deve ignorar item sem produto e registrar aviso", async () => {
		const resultado = await registrarMovimentosEstoqueNf({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			idlocalestoque: "local-1",
			dataMovimento: "2026-06-24",
			sentido: "saida",
			itens: [
				{
					iditem: "item-1",
					idproduto: "",
					quantidade: "1",
					custoUnitario: "0",
				},
			],
		});

		expect(resultado.movimentosCriados).toBe(0);
		expect(resultado.avisos.length).toBeGreaterThan(0);
		expect(registrarMovimento.registrarMovimentoEstoque).not.toHaveBeenCalled();
	});

	it("deve buscar custo do produto quando não informado", async () => {
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			custoaquisicao: "15.50",
		} as never);

		await registrarMovimentosEstoqueNf({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			idlocalestoque: "local-1",
			dataMovimento: "2026-06-24",
			sentido: "entrada",
			itens: [
				{
					iditem: "item-1",
					idproduto: "prod-1",
					quantidade: "1",
					custoUnitario: "0",
				},
			],
		});

		expect(produtosRepository.buscarProdutoPorId).toHaveBeenCalledWith("prod-1");
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				tipoestoque: TIPO_ESTOQUE.AMBOS,
				custoaquisicao: "15.50",
			}),
		);
	});

	it("preserva quantidade fracionária com vírgula", async () => {
		await registrarMovimentosEstoqueNf({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			idlocalestoque: "local-1",
			dataMovimento: "2026-06-24",
			sentido: "entrada",
			itens: [
				{
					iditem: "item-1",
					idproduto: "prod-1",
					quantidade: "1,5",
					custoUnitario: "10",
				},
			],
		});

		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({ quantidade: "1.500000" }),
		);
	});

	it("avisa quando não há local de estoque e não grava movimento", async () => {
		const resultado = await registrarMovimentosEstoqueNf({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			dataMovimento: "2026-06-24",
			sentido: "entrada",
			itens: [
				{
					iditem: "item-1",
					idproduto: "prod-1",
					quantidade: "4",
					custoUnitario: "10",
				},
			],
		});

		expect(resultado.movimentosCriados).toBe(0);
		expect(resultado.avisos[0]).toMatch(/local de estoque/i);
		expect(registrarMovimento.registrarMovimentoEstoque).not.toHaveBeenCalled();
	});

	it("não duplica item que já tem movimento e lança só o que falta", async () => {
		vi.mocked(
			movimentoEstoqueRepository.listarMovimentosEstoquePorDocumento,
		).mockResolvedValue([
			{
				iditemoriginal: "item-1",
				cancelado: 0,
				quantidadeentrada: "4.000000",
			},
		] as never);

		const resultado = await registrarMovimentosEstoqueNf({
			idempresa: "emp-1",
			idnotafiscal: "nf-1",
			idlocalestoque: "local-1",
			dataMovimento: "2026-06-24",
			sentido: "entrada",
			itens: [
				{
					iditem: "item-1",
					idproduto: "prod-1",
					quantidade: "4",
					custoUnitario: "10",
				},
				{
					iditem: "item-2",
					idproduto: "prod-2",
					quantidade: "1.25",
					custoUnitario: "8",
				},
			],
		});

		expect(resultado.movimentosCriados).toBe(1);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledTimes(1);
		expect(registrarMovimento.registrarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				iditemoriginal: "item-2",
				quantidade: "1.250000",
			}),
		);
	});
});

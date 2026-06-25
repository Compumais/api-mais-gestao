import { beforeEach, describe, expect, it, vi } from "vitest";
import * as movimentoEstoqueRepository from "@/repositories/movimento-estoque-repositories.js";
import * as produtosRepository from "@/repositories/produtos-repositories.js";
import { registrarMovimentosEstoqueNf } from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";

vi.mock("@/repositories/movimento-estoque-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");

describe("registrarMovimentosEstoqueNf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			movimentoEstoqueRepository.listarMovimentosEstoquePorDocumento,
		).mockResolvedValue([]);
	});

	it("deve registrar saída de estoque na venda", async () => {
		vi.mocked(movimentoEstoqueRepository.criarMovimentoEstoque).mockResolvedValue({
			id: 1,
		} as never);

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
		expect(movimentoEstoqueRepository.criarMovimentoEstoque).toHaveBeenCalledWith(
			expect.objectContaining({
				quantidadesaida: "2",
				quantidadeentrada: null,
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
	});

	it("deve buscar custo do produto quando não informado", async () => {
		vi.mocked(produtosRepository.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			custoaquisicao: "15.50",
		} as never);
		vi.mocked(movimentoEstoqueRepository.criarMovimentoEstoque).mockResolvedValue({
			id: 1,
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
	});
});

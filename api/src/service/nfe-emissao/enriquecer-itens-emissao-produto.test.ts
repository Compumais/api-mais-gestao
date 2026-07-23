import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cestRepositories from "@/repositories/cest-repositories.js";
import * as produtosRepositories from "@/repositories/produtos-repositories.js";
import { enriquecerItensEmissaoComProduto } from "./enriquecer-itens-emissao-produto.js";

vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/cest-repositories.js");

describe("enriquecerItensEmissaoComProduto", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("preenche cest a partir de idcest do produto", async () => {
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			idempresa: "emp-1",
			codigo: 10,
			idcest: "cest-1",
			cest: 0,
			ean: "17898380412250",
			eantributavel: null,
		} as Awaited<ReturnType<typeof produtosRepositories.buscarProdutoPorId>>);

		vi.mocked(cestRepositories.buscarCestPorId).mockResolvedValue({
			id: "cest-1",
			codigo: "1703200",
		} as Awaited<ReturnType<typeof cestRepositories.buscarCestPorId>>);

		const itens = await enriquecerItensEmissaoComProduto([
			{
				idproduto: "prod-1",
				descricao: "Produto ST",
				ncm: "22021000",
				cest: "0000000",
				cfop: "5405",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
				cst: "10",
			},
		]);

		expect(itens[0]?.cest).toBe("1703200");
		expect(itens[0]?.ean).toBe("17898380412250");
		expect(itens[0]?.codigoProduto).toBe("10");
	});

	it("não sobrescreve cest já informado no item", async () => {
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			idempresa: "emp-1",
			idcest: "cest-1",
			cest: null,
			ean: null,
			eantributavel: null,
		} as Awaited<ReturnType<typeof produtosRepositories.buscarProdutoPorId>>);

		const itens = await enriquecerItensEmissaoComProduto([
			{
				idproduto: "prod-1",
				descricao: "Produto ST",
				ncm: "22021000",
				cest: "2805900",
				cfop: "5405",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
				cst: "10",
			},
		]);

		expect(itens[0]?.cest).toBe("2805900");
		expect(cestRepositories.buscarCestPorId).not.toHaveBeenCalled();
	});
});

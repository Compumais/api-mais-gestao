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

	it("preenche CST e alíquota PIS/COFINS do produto quando o item não tem", async () => {
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			idempresa: "emp-1",
			codigo: 10,
			idcest: null,
			cest: null,
			ean: null,
			eantributavel: null,
			cstpis: "1.00",
			cstcofins: "1.00",
			aliquotapis: "1.65",
			aliquotacofins: "7.60",
		} as Awaited<ReturnType<typeof produtosRepositories.buscarProdutoPorId>>);

		const itens = await enriquecerItensEmissaoComProduto([
			{
				idproduto: "prod-1",
				descricao: "Produto importado",
				ncm: "22021000",
				cfop: "5102",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
			},
		]);

		expect(itens[0]?.cstPis).toBe("01");
		expect(itens[0]?.cstCofins).toBe("01");
		expect(itens[0]?.aliquotaPis).toBe(1.65);
		expect(itens[0]?.aliquotaCofins).toBe(7.6);
	});

	it("preenche CSOSN 202 e alíquotas de ST do produto quando o item não tem", async () => {
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			idempresa: "emp-1",
			codigo: 10,
			idcest: null,
			cest: null,
			ean: null,
			eantributavel: null,
			situacaotributariasn: "202",
			percentualmva: "40.00",
			ultimaaliquotaicmsst: "18.00",
			ultimaaliquotafcpst: "2.00",
		} as Awaited<ReturnType<typeof produtosRepositories.buscarProdutoPorId>>);

		const itens = await enriquecerItensEmissaoComProduto([
			{
				idproduto: "prod-1",
				descricao: "Produto ST",
				ncm: "22021000",
				cfop: "5401",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
			},
		]);

		expect(itens[0]?.csosn).toBe("202");
		expect(itens[0]?.cst).toBeUndefined();
		expect(itens[0]?.percentualMvaSt).toBe(40);
		expect(itens[0]?.aliquotaIcmsSt).toBe(18);
		expect(itens[0]?.aliquotaFcpSt).toBe(2);
	});

	it("não inventa CSOSN 102 nem MVA quando o cadastro está vazio", async () => {
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			idempresa: "emp-1",
			idcest: null,
			cest: null,
			ean: null,
			eantributavel: null,
			situacaotributariasn: null,
			percentualmva: null,
			ultimaaliquotaicmsst: null,
			ultimaaliquotafcpst: null,
		} as Awaited<ReturnType<typeof produtosRepositories.buscarProdutoPorId>>);

		const itens = await enriquecerItensEmissaoComProduto([
			{
				idproduto: "prod-1",
				descricao: "Produto sem ST",
				ncm: "22021000",
				cfop: "5102",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
			},
		]);

		expect(itens[0]?.csosn).toBeUndefined();
		expect(itens[0]?.percentualMvaSt).toBeUndefined();
		expect(itens[0]?.aliquotaIcmsSt).toBeUndefined();
	});

	it("não sobrescreve CSOSN já informado no item", async () => {
		vi.mocked(produtosRepositories.buscarProdutoPorId).mockResolvedValue({
			id: "prod-1",
			idempresa: "emp-1",
			idcest: null,
			cest: null,
			ean: null,
			eantributavel: null,
			situacaotributariasn: "202",
			percentualmva: "40.00",
		} as Awaited<ReturnType<typeof produtosRepositories.buscarProdutoPorId>>);

		const itens = await enriquecerItensEmissaoComProduto([
			{
				idproduto: "prod-1",
				descricao: "Produto ST",
				ncm: "22021000",
				cfop: "5401",
				unidade: "UN",
				quantidade: 1,
				valorUnitario: 10,
				csosn: "102",
			},
		]);

		expect(itens[0]?.csosn).toBe("102");
		expect(itens[0]?.percentualMvaSt).toBe(40);
	});
});

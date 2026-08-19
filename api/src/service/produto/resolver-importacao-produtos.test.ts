import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cestRepo from "@/repositories/cest-repositories.js";
import * as cfopRepo from "@/repositories/cfop-repositories.js";
import * as hierarquiaRepo from "@/repositories/hierarquia-repositories.js";
import * as ncmRepo from "@/repositories/ncm-repositories.js";
import * as produtosRepo from "@/repositories/produtos-repositories.js";
import * as unidadeRepo from "@/repositories/unidade-medida-repositories.js";
import type { ResultadoValidacaoImportacaoProdutos } from "@/util/produtos-importacao.js";
import {
	montarDadosProdutoImportacao,
	resolverProdutosImportacao,
} from "./resolver-importacao-produtos.js";

vi.mock("@/repositories/cest-repositories.js");
vi.mock("@/repositories/cfop-repositories.js");
vi.mock("@/repositories/hierarquia-repositories.js");
vi.mock("@/repositories/ncm-repositories.js");
vi.mock("@/repositories/produtos-repositories.js");
vi.mock("@/repositories/unidade-medida-repositories.js");

function linhaFiscalVazia() {
	return {
		cfopSaida: null as string | null,
		cfopEntrada: null as string | null,
		cfopNfce: null as string | null,
		tipoproduto: null as string | null,
		situacaotributariasnentrada: null as string | null,
		cst: null as string | null,
		csosn: null as string | null,
		tributacaoespecial: null as string | null,
		tributacaosn: null as string | null,
		cstipientrada: null as string | null,
		cstipisaida: null as string | null,
		cstpisentrada: null as string | null,
		cstcofinsentrada: null as string | null,
		cstpis: null as string | null,
		cstcofins: null as string | null,
	};
}

function validacaoBase(): ResultadoValidacaoImportacaoProdutos {
	return {
		errosGerais: [],
		totalProdutos: 1,
		totalErros: 0,
		produtos: [
			{
				linha: 2,
				codigo: 10,
				ean: "7891000055120",
				referencia: "REF01",
				nome: "Refrigerante 2L",
				grupo: "BEBIDAS",
				unidade: "UN",
				preco: "9.90",
				custo: "5.50",
				ncm: "22021000",
				cest: null,
				origem: 0,
				mva: "40.00",
				estoque: 10,
				ippt: "P",
				...linhaFiscalVazia(),
				aliquotas: {
					aliquotaicmsinterna: "18.00",
					aliquotaicmsdiferencialentrada: null,
					aliquotareducaoicmsnfcesat: null,
					aliquotafcpnf: null,
					ultimaaliquotaicmsst: null,
					ultimaaliquotafcpst: null,
					aliquotapis: "1.65",
					aliquotapisentrada: null,
					aliquotacofins: "7.60",
					aliquotaconfinsentrada: null,
					aliquotapisconfinssaidapreco: null,
					aliquotapisconfinsentradapreco: null,
					aliquotaiss: null,
				},
				erros: [],
			},
		],
	};
}

describe("resolverProdutosImportacao", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(hierarquiaRepo.listarHierarquiasPorEmpresa).mockResolvedValue([
			{ id: "grupo-1", codigo: "01", nome: "BEBIDAS" },
		]);
		vi.mocked(unidadeRepo.listarUnidadesMedidaPorEmpresa).mockResolvedValue([
			{ id: "un-1", codigo: "UN", idempresa: "emp-1" },
		]);
		vi.mocked(produtosRepo.listarIdentificadoresProdutos).mockResolvedValue([]);
		vi.mocked(ncmRepo.buscarNcmPorCodigo).mockResolvedValue(undefined as never);
		vi.mocked(cestRepo.buscarCestPorCodigo).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(cfopRepo.buscarCfopPorCodigo).mockResolvedValue(
			undefined as never,
		);
	});

	it("marca erro quando o grupo não existe", async () => {
		vi.mocked(hierarquiaRepo.listarHierarquiasPorEmpresa).mockResolvedValue([]);

		const resolvidos = await resolverProdutosImportacao({
			idempresa: "emp-1",
			validacao: validacaoBase(),
		});

		expect(resolvidos[0]?.erros.join(" ")).toContain("Grupo");
	});

	it("atualiza produto existente pelo código", async () => {
		vi.mocked(produtosRepo.listarIdentificadoresProdutos).mockResolvedValue([
			{ id: "prod-1", codigo: 10, ean: "7891000055120" },
		]);

		const resolvidos = await resolverProdutosImportacao({
			idempresa: "emp-1",
			validacao: validacaoBase(),
		});

		expect(resolvidos[0]?.acao).toBe("atualizar");
		expect(resolvidos[0]?.idExistente).toBe("prod-1");
	});

	it("cria produto quando código e EAN ainda não existem", async () => {
		const resolvidos = await resolverProdutosImportacao({
			idempresa: "emp-1",
			validacao: validacaoBase(),
		});

		expect(resolvidos[0]?.acao).toBe("criar");
		expect(resolvidos[0]?.idExistente).toBeNull();
		expect(resolvidos[0]?.codigoFinal).toBe(10);
		expect(resolvidos[0]?.erros).toEqual([]);
	});

	it("atualiza produto existente pelo EAN quando o código não foi informado", async () => {
		vi.mocked(produtosRepo.listarIdentificadoresProdutos).mockResolvedValue([
			{ id: "prod-ean", codigo: 22, ean: "7891000055120" },
		]);

		const validacao = validacaoBase();
		validacao.produtos[0] = {
			...validacao.produtos[0],
			codigo: null,
		};

		const resolvidos = await resolverProdutosImportacao({
			idempresa: "emp-1",
			validacao,
		});

		expect(resolvidos[0]?.acao).toBe("atualizar");
		expect(resolvidos[0]?.idExistente).toBe("prod-ean");
		expect(resolvidos[0]?.codigoFinal).toBe(22);
	});

	it("gera próximo código ao criar produto sem código na planilha", async () => {
		vi.mocked(produtosRepo.listarIdentificadoresProdutos).mockResolvedValue([
			{ id: "prod-1", codigo: 5, ean: "111" },
		]);

		const validacao = validacaoBase();
		validacao.produtos[0] = {
			...validacao.produtos[0],
			codigo: null,
			ean: "7890000000001",
		};

		const resolvidos = await resolverProdutosImportacao({
			idempresa: "emp-1",
			validacao,
		});

		expect(resolvidos[0]?.acao).toBe("criar");
		expect(resolvidos[0]?.codigoFinal).toBe(6);
	});

	it("marca erro quando o EAN pertence a outro produto", async () => {
		vi.mocked(produtosRepo.listarIdentificadoresProdutos).mockResolvedValue([
			{ id: "prod-1", codigo: 10, ean: "111" },
			{ id: "prod-2", codigo: 20, ean: "7891000055120" },
		]);

		const resolvidos = await resolverProdutosImportacao({
			idempresa: "emp-1",
			validacao: validacaoBase(),
		});

		expect(resolvidos[0]?.erros.join(" ")).toContain(
			"EAN já pertence a outro produto",
		);
	});

	it("marca erro quando o CFOP informado não existe", async () => {
		const validacao = validacaoBase();
		validacao.produtos[0] = {
			...validacao.produtos[0],
			cfopEntrada: "1102",
			cfopSaida: "5102",
			cfopNfce: "5102",
		};

		const resolvidos = await resolverProdutosImportacao({
			idempresa: "emp-1",
			validacao,
		});

		expect(resolvidos[0]?.erros.join(" ")).toContain("CFOP de entrada");
		expect(resolvidos[0]?.erros.join(" ")).toContain("CFOP de saída");
		expect(resolvidos[0]?.erros.join(" ")).toContain("CFOP NFC-e");
	});
});

describe("montarDadosProdutoImportacao", () => {
	it("persiste MVA e alíquotas informadas", () => {
		const dados = montarDadosProdutoImportacao("emp-1", {
			...validacaoBase().produtos[0],
			acao: "criar",
			idExistente: null,
			codigoFinal: 10,
			idgrupo: "grupo-1",
			idunidademedida: "un-1",
			unidademedida: "UN",
			idncm: null,
			idcest: null,
			idcfopentrada: null,
			idcfopsaida: null,
			idcfopsaidanfce: null,
			erros: [],
		});

		expect(dados.percentualmva).toBe("40.00");
		expect(dados.aliquotaicmsinterna).toBe("18.00");
		expect(dados.aliquotapis).toBe("1.65");
		expect(dados.aliquotacofins).toBe("7.60");
		expect(dados.aliquotaiss).toBeUndefined();
	});

	it("persiste CFOPs e tributação informados na planilha", () => {
		const dados = montarDadosProdutoImportacao("emp-1", {
			...validacaoBase().produtos[0],
			acao: "atualizar",
			idExistente: "prod-1",
			codigoFinal: 10,
			idgrupo: "grupo-1",
			idunidademedida: "un-1",
			unidademedida: "UN",
			idncm: null,
			idcest: null,
			idcfopentrada: "cfop-e",
			idcfopsaida: "cfop-s",
			idcfopsaidanfce: "cfop-n",
			tipoproduto: "04",
			situacaotributariasnentrada: "00",
			cst: "00",
			csosn: "102",
			tributacaoespecial: "00",
			tributacaosn: "102",
			cstipientrada: "00",
			cstipisaida: "50",
			cstpisentrada: "50",
			cstcofinsentrada: "50",
			cstpis: "01",
			cstcofins: "01",
			erros: [],
		});

		expect(dados.idcfopentrada).toBe("cfop-e");
		expect(dados.idcfopsaida).toBe("cfop-s");
		expect(dados.idcfopsaidanfce).toBe("cfop-n");
		expect(dados.tipoproduto).toBe("04");
		expect(dados.situacaotributariasnentrada).toBe("00");
		expect(dados.situacaotributaria).toBe("00");
		expect(dados.situacaotributariasn).toBe("102");
		expect(dados.tributacaoespecial).toBe("00");
		expect(dados.tributacaosn).toBe("102");
		expect(dados.cstipientrada).toBe("00");
		expect(dados.cstipisaida).toBe("50");
		expect(dados.cstpisentrada).toBe("50");
		expect(dados.cstcofinsentrada).toBe("50");
		expect(dados.cstpis).toBe("01");
		expect(dados.cstcofins).toBe("01");
	});
});
